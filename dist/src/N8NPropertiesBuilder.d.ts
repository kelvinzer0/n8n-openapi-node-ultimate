import { INodeProperties } from 'n8n-workflow';
import { ResourceCollector as ResourcePropertiesCollector } from "./ResourceCollector";
import { BaseOperationsCollector } from "./OperationsCollector";
import { IOperationParser } from "./OperationParser";
import { IResourceParser } from "./ResourceParser";
interface Logger {
    info(obj: any, msg?: string): void;
    warn(obj: any, msg?: string): void;
}
export interface Override {
    find: any;
    replace: any;
}
export interface N8NPropertiesBuilderConfig {
    logger?: Logger;
    OperationsCollector?: typeof BaseOperationsCollector;
    ResourcePropertiesCollector?: typeof ResourcePropertiesCollector;
    operation?: IOperationParser;
    resource?: IResourceParser;
}
/**
 *
 * Builds n8n node "properties" from an OpenAPI document.
 * It uses a walker to traverse the OpenAPI document and collect the necessary information.
 * The collected information is then used to build the n8n node properties.
 * The class uses a set of parsers to parse the OpenAPI document and build the n8n node properties.
 *
 */
export declare class N8NPropertiesBuilder {
    private readonly doc;
    private readonly logger;
    private readonly walker;
    private readonly operationParser;
    private readonly resourceParser;
    private readonly OperationsCollector;
    private readonly ResourcePropertiesCollector;
    constructor(doc: any, config?: N8NPropertiesBuilderConfig);
    build(overrides?: Override[]): INodeProperties[];
    /**
     * Build an n8n ICredentialTestRequest from the OpenAPI spec.
     *
     * Auto-selects the best GET endpoint for credential testing:
     *  - Prefers endpoints without path params
     *  - Favors common patterns like /health, /me, /status
     *  - Falls back to the simplest available GET endpoint
     *
     * Returns null if no GET endpoints exist in the spec.
     *
     * Usage:
     *   const testRequest = builder.buildCredentialTestRequest();
     *   // Use in n8n credential definition:
     *   // { name: 'myApi', ..., testRequest: testRequest }
     */
    buildCredentialTestRequest(): Record<string, any> | null;
    /**
     * Get all GET endpoints sorted by credential-test suitability.
     * Useful for debugging or letting users pick a specific endpoint.
     */
    getCredentialTestCandidates(): Array<{
        pattern: string;
        operationId?: string;
        score: number;
    }>;
    private update;
}
export {};
