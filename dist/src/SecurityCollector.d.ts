import { OpenAPIV3 } from "openapi-types";
import { INodeProperties } from "n8n-workflow";
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
export declare class SecurityCollector {
    private readonly doc;
    private readonly seenSchemes;
    constructor(doc: OpenAPIV3.Document);
    /**
     * Collect security fields for a specific operation.
     * Call this per-operation during the walk.
     * Returns fields that should be added to that operation's display group.
     */
    collectForOperation(operation: OpenAPIV3.OperationObject): INodeProperties[];
    /**
     * Build (or return cached) INodeProperties for a security scheme name.
     */
    private buildFieldForScheme;
    /**
     * Build field for apiKey security scheme.
     * Dynamically reads `in` (header/query/cookie) and `name` from the spec.
     */
    private buildApiKeyField;
    /**
     * Build field for http security scheme (Bearer, Basic, etc).
     * Creates an Authorization header field.
     */
    private buildHttpField;
    /**
     * Build a human-readable display name from param name or scheme name.
     */
    private buildDisplayName;
    /**
     * Sanitize scheme name for use as n8n field name.
     */
    private sanitizeName;
}
