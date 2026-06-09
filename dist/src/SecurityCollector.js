"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityCollector = void 0;
const utils_1 = require("./n8n/utils");
/**
 * Resolves the effective security requirements for an operation.
 * Per-operation security overrides global security.
 * Returns an empty array if security is explicitly set to [] (public endpoint).
 */
function resolveSecurity(doc, operation) {
    // Per-operation security overrides global
    if (operation && operation.security !== undefined) {
        return operation.security;
    }
    // Fall back to global security
    return doc.security || [];
}
/**
 * Looks up the SecuritySchemeObject for a given scheme name.
 */
function getScheme(doc, name) {
    var _a, _b;
    return (_b = (_a = doc.components) === null || _a === void 0 ? void 0 : _a.securitySchemes) === null || _b === void 0 ? void 0 : _b[name];
}
/**
 * Collects n8n INodeProperties fields for security schemes defined in an OpenAPI spec.
 *
 * For each security requirement on an operation:
 *  - apiKey type → header or query field with the exact param name from spec
 *  - http type (bearer/basic) → Authorization header field
 *  - oauth2 type → skipped (needs manual credential setup)
 *
 * Returns deduplicated fields (same scheme used across operations = one field).
 */
class SecurityCollector {
    constructor(doc) {
        this.seenSchemes = new Map();
        this.doc = doc;
    }
    /**
     * Collect security fields for a specific operation.
     * Call this per-operation during the walk.
     * Returns fields that should be added to that operation's display group.
     */
    collectForOperation(operation) {
        const requirements = resolveSecurity(this.doc, operation);
        if (requirements.length === 0) {
            return [];
        }
        const fields = [];
        for (const req of requirements) {
            for (const schemeName of Object.keys(req)) {
                const field = this.buildFieldForScheme(schemeName);
                if (field) {
                    fields.push({ ...field });
                }
            }
        }
        return fields;
    }
    /**
     * Build (or return cached) INodeProperties for a security scheme name.
     */
    buildFieldForScheme(schemeName) {
        if (this.seenSchemes.has(schemeName)) {
            return this.seenSchemes.get(schemeName);
        }
        const scheme = getScheme(this.doc, schemeName);
        if (!scheme) {
            // Unknown scheme name — skip silently
            return null;
        }
        let field = null;
        switch (scheme.type) {
            case 'apiKey':
                field = this.buildApiKeyField(schemeName, scheme);
                break;
            case 'http':
                field = this.buildHttpField(schemeName, scheme);
                break;
            case 'oauth2':
                // OAuth2 requires interactive credential setup — skip field generation
                // but could add a notice if desired
                break;
            case 'openIdConnect':
                // Similar to OAuth2 — skip
                break;
        }
        if (field) {
            this.seenSchemes.set(schemeName, field);
        }
        return field;
    }
    /**
     * Build field for apiKey security scheme.
     * Dynamically reads `in` (header/query/cookie) and `name` from the spec.
     */
    buildApiKeyField(schemeName, scheme) {
        const paramName = scheme.name; // e.g. "x-api-key", "api_key", "X-API-KEY"
        const location = scheme.in; // "header" | "query" | "cookie"
        const displayName = this.buildDisplayName(paramName, schemeName);
        const description = scheme.description
            || `API key for ${schemeName} (${location}: ${paramName})`;
        const field = {
            displayName,
            name: `security_${this.sanitizeName(schemeName)}`,
            type: 'string',
            default: '',
            description,
            required: false,
        };
        // Set routing based on where the key goes
        switch (location) {
            case 'header':
                field.routing = {
                    request: {
                        headers: {
                            [paramName]: '={{ $value }}',
                        },
                    },
                };
                break;
            case 'query':
                field.routing = {
                    send: {
                        type: 'query',
                        property: paramName,
                        value: '={{ $value }}',
                        propertyInDotNotation: false,
                    },
                };
                break;
            case 'cookie':
                // Cookie auth — send as Cookie header
                field.routing = {
                    request: {
                        headers: {
                            'Cookie': `={{ '${paramName}=' + $value }}`,
                        },
                    },
                };
                break;
        }
        return field;
    }
    /**
     * Build field for http security scheme (Bearer, Basic, etc).
     * Creates an Authorization header field.
     */
    buildHttpField(schemeName, scheme) {
        var _a;
        const schemeType = ((_a = scheme.scheme) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'bearer';
        const description = scheme.description
            || `HTTP ${schemeType} authentication for ${schemeName}`;
        let authPrefix;
        let displayName;
        switch (schemeType) {
            case 'bearer':
                displayName = 'Bearer Token';
                authPrefix = 'Bearer ';
                break;
            case 'basic':
                displayName = 'Basic Auth (Base64)';
                authPrefix = 'Basic ';
                break;
            default:
                displayName = `${(0, utils_1.smartStartCase)(schemeType)} Token`;
                authPrefix = `${(0, utils_1.smartStartCase)(schemeType)} `;
        }
        const field = {
            displayName,
            name: `security_${this.sanitizeName(schemeName)}`,
            type: 'string',
            default: '',
            description,
            required: false,
            routing: {
                request: {
                    headers: {
                        'Authorization': `={{ '${authPrefix}' + $value }}`,
                    },
                },
            },
        };
        return field;
    }
    /**
     * Build a human-readable display name from param name or scheme name.
     */
    buildDisplayName(paramName, schemeName) {
        // If param name looks like a header (x-api-key), startCase it
        if (paramName.toLowerCase().startsWith('x-')) {
            return (0, utils_1.smartStartCase)(paramName.replace(/^x-/, '')) + ' (Header)';
        }
        // If it's a common pattern
        if (paramName.toLowerCase().includes('api')) {
            return (0, utils_1.smartStartCase)(paramName);
        }
        // Fallback to scheme name
        return (0, utils_1.smartStartCase)(schemeName) + ' API Key';
    }
    /**
     * Sanitize scheme name for use as n8n field name.
     */
    sanitizeName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }
}
exports.SecurityCollector = SecurityCollector;
//# sourceMappingURL=SecurityCollector.js.map