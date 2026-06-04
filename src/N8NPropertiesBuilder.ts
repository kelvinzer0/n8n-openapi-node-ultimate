import {INodeProperties} from 'n8n-workflow';
import {OpenAPIV3} from 'openapi-types';
import {OpenAPIWalker} from "./openapi/OpenAPIWalker";
import {ResourceCollector as ResourcePropertiesCollector} from "./ResourceCollector";
import {BaseOperationsCollector, OperationsCollector as OperationsCollectorImpl} from "./OperationsCollector";
import * as lodash from "lodash";
import {DefaultOperationParser, IOperationParser} from "./OperationParser";
import {DefaultResourceParser, IResourceParser} from "./ResourceParser";

// Minimal logger interface — no external deps needed at runtime
interface Logger {
    info(obj: any, msg?: string): void;
    warn(obj: any, msg?: string): void;
}

const defaultLogger: Logger = {
    info: (obj: any, msg?: string) => {
        if (process.env.NODE_ENV === 'development') console.log(msg || 'info', obj);
    },
    warn: (obj: any, msg?: string) => {
        if (process.env.NODE_ENV === 'development') console.warn(msg || 'warn', obj);
    },
};

export interface Override {
    find: any;
    replace: any;
}

export interface N8NPropertiesBuilderConfig {
    logger?: Logger;
    OperationsCollector?: typeof BaseOperationsCollector,
    ResourcePropertiesCollector?: typeof ResourcePropertiesCollector
    operation?: IOperationParser,
    resource?: IResourceParser,
}

/**
 *
 * Builds n8n node "properties" from an OpenAPI document.
 * It uses a walker to traverse the OpenAPI document and collect the necessary information.
 * The collected information is then used to build the n8n node properties.
 * The class uses a set of parsers to parse the OpenAPI document and build the n8n node properties.
 *
 */
export class N8NPropertiesBuilder {
    private readonly doc: OpenAPIV3.Document;
    private readonly logger: Logger
    private readonly walker: OpenAPIWalker;

    // DI
    private readonly operationParser: IOperationParser;
    private readonly resourceParser: IResourceParser;
    private readonly OperationsCollector: typeof BaseOperationsCollector;
    private readonly ResourcePropertiesCollector: typeof ResourcePropertiesCollector;

    constructor(doc: any, config?: N8NPropertiesBuilderConfig) {
        this.doc = doc
        this.logger = config?.logger || defaultLogger
        this.walker = new OpenAPIWalker(this.doc)

        // DI
        this.operationParser = config?.operation || new DefaultOperationParser()
        this.resourceParser = config?.resource || new DefaultResourceParser()
        this.OperationsCollector = config?.OperationsCollector ? config.OperationsCollector : OperationsCollectorImpl
        this.ResourcePropertiesCollector = config?.ResourcePropertiesCollector ? config.ResourcePropertiesCollector : ResourcePropertiesCollector
    }

    build(overrides: Override[] = []): INodeProperties[] {
        const resourcePropertiesCollector = new this.ResourcePropertiesCollector(this.resourceParser)
        this.walker.walk(resourcePropertiesCollector)
        const resourceNode = resourcePropertiesCollector.resources

        const operationsCollector = new this.OperationsCollector(
            this.doc,
            this.operationParser,
            this.resourceParser,
            this.logger,
        )
        this.walker.walk(operationsCollector)
        const operations = operationsCollector.operations
        const fields = operationsCollector.fields

        const properties = [resourceNode, ...operations, ...fields]
        return this.update(properties, overrides)
    }

    private update(fields: any[], patterns: Override[]) {
        for (const pattern of patterns) {
            for (const element of lodash.filter(fields, pattern.find)) {
                Object.assign(element, pattern.replace);
            }
        }
        return fields
    }
}
