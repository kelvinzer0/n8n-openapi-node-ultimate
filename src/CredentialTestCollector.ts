import {OpenAPIVisitor, OperationContext} from "./openapi/OpenAPIVisitor";
import {OpenAPIV3} from "openapi-types";
import {SecurityCollector} from "./SecurityCollector";

type SecurityScheme = OpenAPIV3.SecuritySchemeObject;

/**
 * Scores a GET endpoint for suitability as a credential test.
 * Lower score = better candidate.
 *
 * Preferences:
 *  - ApiKey or Basic auth (simpler to test than OAuth2)
 *  - No path params (simpler URL)
 *  - Common "health/me/list" patterns
 *  - Lower path depth (closer to root)
 */
function scoreGetEndpoint(
    pattern: string,
    operation: OpenAPIV3.OperationObject,
    doc: OpenAPIV3.Document,
): number {
    let score = 0;

    // Penalize path params — we want simple URLs
    const paramCount = (pattern.match(/{[^}]+}/g) || []).length;
    score += paramCount * 100;

    // Prefer endpoints with apiKey or http (basic/bearer) auth over OAuth2
    const security = operation.security || doc.security || [];
    let hasApiKey = false;
    let hasHttp = false;
    let hasOAuth2 = false;

    for (const req of security) {
        for (const schemeName of Object.keys(req)) {
            const scheme = doc.components?.securitySchemes?.[schemeName] as OpenAPIV3.SecuritySchemeObject | undefined;
            if (!scheme) continue;
            if (scheme.type === 'apiKey') hasApiKey = true;
            else if (scheme.type === 'http') hasHttp = true;
            else if (scheme.type === 'oauth2') hasOAuth2 = true;
        }
    }

    if (hasApiKey) score -= 30;      // Best for testing
    if (hasHttp) score -= 20;        // Good (bearer/basic)
    if (hasOAuth2) score += 20;      // Harder to test

    // Bonus for common "safe" test endpoints
    const lower = pattern.toLowerCase();
    const goodPatterns = [
        '/health', '/status', '/ping', '/version', '/info',
        '/me', '/user', '/users/me', '/whoami',
        '/account', '/profile', '/inventory',
    ];
    for (const p of goodPatterns) {
        if (lower === p || lower.endsWith(p)) {
            score -= 50;
            break;
        }
    }

    // Bonus for list endpoints (GET /resources — no trailing param)
    const segments = pattern.split('/').filter(Boolean);
    if (segments.length <= 2 && paramCount === 0) {
        score -= 20;
    }

    // Penalize deep paths
    score += segments.length * 5;

    // Bonus for having operationId
    if (operation.operationId) {
        score -= 5;
    }

    return score;
}

/**
 * Builds an n8n ICredentialTestRequest from an OpenAPI spec.
 *
 * Strategy:
 *  1. Collect all GET endpoints
 *  2. Score them by suitability (simple, no path params, common patterns)
 *  3. Pick the best one
 *  4. Build the test request with auth headers from SecurityCollector
 *
 * Usage:
 *   const collector = new CredentialTestCollector(doc);
 *   walker.walk(collector);
 *   const testRequest = collector.testRequest; // ICredentialTestRequest | null
 */
export class CredentialTestCollector implements OpenAPIVisitor {
    private readonly doc: OpenAPIV3.Document;
    private readonly securityCollector: SecurityCollector;
    private readonly candidates: Array<{
        pattern: string;
        operation: OpenAPIV3.OperationObject;
        context: OperationContext;
        score: number;
    }> = [];

    constructor(doc: OpenAPIV3.Document) {
        this.doc = doc;
        this.securityCollector = new SecurityCollector(doc);
    }

    visitOperation(operation: OpenAPIV3.OperationObject, context: OperationContext): void {
        // Only consider GET endpoints
        if (context.method.toLowerCase() !== 'get') {
            return;
        }

        // Skip endpoints that require path params we can't fill
        // (we'll still include them but with lower priority)
        const score = scoreGetEndpoint(context.pattern, operation, this.doc);

        this.candidates.push({
            pattern: context.pattern,
            operation,
            context,
            score,
        });
    }

    /**
     * Get the best GET endpoint for credential testing.
     * Returns null if no GET endpoints found.
     */
    get testEndpoint(): { pattern: string; operation: OpenAPIV3.OperationObject } | null {
        if (this.candidates.length === 0) {
            return null;
        }

        // Sort by score (lower = better)
        this.candidates.sort((a, b) => a.score - b.score);
        const best = this.candidates[0];

        return { pattern: best.pattern, operation: best.operation };
    }

    /**
     * Get all GET endpoints sorted by suitability.
     * Useful for debugging or letting users choose.
     */
    get allGetEndpoints(): Array<{ pattern: string; operationId?: string; score: number }> {
        return this.candidates
            .sort((a, b) => a.score - b.score)
            .map(c => ({
                pattern: c.pattern,
                operationId: c.operation.operationId,
                score: c.score,
            }));
    }

    /**
     * Build the n8n ICredentialTestRequest object.
     * Returns null if no suitable GET endpoint found.
     *
     * The returned object can be used directly as the `testRequest`
     * property in an n8n credential type definition.
     */
    get testRequest(): Record<string, any> | null {
        const endpoint = this.testEndpoint;
        if (!endpoint) {
            return null;
        }

        // Build auth headers from security schemes
        const authHeaders: Record<string, string> = {};
        const securityFields = this.securityCollector.collectForOperation(endpoint.operation);

        // Also check global security if operation has none
        const hasOwnSecurity = endpoint.operation.security !== undefined;
        const effectiveSecurity = hasOwnSecurity
            ? endpoint.operation.security!
            : (this.doc.security || []);

        // Build auth headers directly from security schemes (more reliable than parsing fields)
        for (const req of effectiveSecurity) {
            for (const schemeName of Object.keys(req)) {
                const scheme = this.doc.components?.securitySchemes?.[schemeName] as SecurityScheme | undefined;
                if (!scheme) continue;

                switch (scheme.type) {
                    case 'http': {
                        const schemeType = scheme.scheme?.toLowerCase() || 'bearer';
                        if (schemeType === 'bearer') {
                            authHeaders['Authorization'] = '={{ "Bearer " + $credentials.accessToken }}';
                        } else if (schemeType === 'basic') {
                            authHeaders['Authorization'] = '={{ "Basic " + Buffer.from($credentials.user + ":" + $credentials.password).toString("base64") }}';
                        }
                        break;
                    }
                    case 'apiKey': {
                        const paramName = scheme.name;
                        const credName = this.sanitizeName(schemeName);
                        if (scheme.in === 'header') {
                            authHeaders[paramName] = `={{ $credentials.${credName} }}`;
                        }
                        // query-based API keys don't go in headers
                        break;
                    }
                    // oauth2 / openIdConnect — skip, can't test programmatically
                }
            }
        }

        // Replace path params with placeholder or remove them
        let url = endpoint.pattern;
        const pathParams = url.match(/{[^}]+}/g) || [];
        if (pathParams.length > 0) {
            // Try to use a version without trailing path params
            // e.g., /api/users/{id} → /api/users
            url = url.replace(/\/{[^}]+}$/, '');
            // If still has params, just use as-is (might fail but better than nothing)
        }

        const request: Record<string, any> = {
            baseURL: '={{ $credentials.baseUrl }}',
            url: url,
            method: 'GET',
        };

        if (Object.keys(authHeaders).length > 0) {
            request.headers = authHeaders;
        }

        return { request };
    }

    /**
     * Build test request for a specific endpoint pattern.
     * Useful when auto-detection doesn't pick the right one.
     */
    buildTestRequestFor(pattern: string, method: string = 'GET'): Record<string, any> | null {
        const candidate = this.candidates.find(c =>
            c.pattern === pattern && c.context.method.toLowerCase() === method.toLowerCase()
        );
        if (!candidate) return null;

        // Temporarily override
        const orig = this.candidates;
        (this as any).candidates = [candidate];
        const result = this.testRequest;
        (this as any).candidates = orig;
        return result;
    }

    private sanitizeName(name: string): string {
        return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }
}
