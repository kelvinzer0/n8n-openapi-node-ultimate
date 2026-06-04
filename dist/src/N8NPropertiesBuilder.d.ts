import { INodeProperties } from 'n8n-workflow';
import pino from 'pino';
import { ResourceCollector as ResourcePropertiesCollector } from "./ResourceCollector";
import { BaseOperationsCollector } from "./OperationsCollector";
import { IOperationParser } from "./OperationParser";
import { IResourceParser } from "./ResourceParser";
export interface Override {
    find: any;
    replace: any;
}
export interface N8NPropertiesBuilderConfig {
    logger?: pino.Logger;
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
    private update;
}
