import { OpenAPIVisitor, OperationContext } from "./openapi/OpenAPIVisitor";
import { OpenAPIV3 } from "openapi-types";
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
export declare class CredentialTestCollector implements OpenAPIVisitor {
    private readonly doc;
    private readonly securityCollector;
    private readonly candidates;
    constructor(doc: OpenAPIV3.Document);
    visitOperation(operation: OpenAPIV3.OperationObject, context: OperationContext): void;
    /**
     * Get the best GET endpoint for credential testing.
     * Returns null if no GET endpoints found.
     */
    get testEndpoint(): {
        pattern: string;
        operation: OpenAPIV3.OperationObject;
    } | null;
    /**
     * Get all GET endpoints sorted by suitability.
     * Useful for debugging or letting users choose.
     */
    get allGetEndpoints(): Array<{
        pattern: string;
        operationId?: string;
        score: number;
    }>;
    /**
     * Build the n8n ICredentialTestRequest object.
     * Returns null if no suitable GET endpoint found.
     *
     * The returned object can be used directly as the `testRequest`
     * property in an n8n credential type definition.
     */
    get testRequest(): Record<string, any> | null;
    /**
     * Build test request for a specific endpoint pattern.
     * Useful when auto-detection doesn't pick the right one.
     */
    buildTestRequestFor(pattern: string, method?: string): Record<string, any> | null;
    private sanitizeName;
}
