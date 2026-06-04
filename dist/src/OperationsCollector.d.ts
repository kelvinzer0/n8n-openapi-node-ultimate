import { OpenAPIVisitor, OperationContext } from "./openapi/OpenAPIVisitor";
import pino from "pino";
import { OpenAPIV3 } from "openapi-types";
import { IOperationParser } from "./OperationParser";
import { INodeProperties } from "n8n-workflow";
import { IResourceParser } from "./ResourceParser";
export declare class BaseOperationsCollector implements OpenAPIVisitor {
    protected operationParser: IOperationParser;
    protected resourceParser: IResourceParser;
    protected logger: pino.Logger;
    readonly _fields: INodeProperties[];
    private optionsByResource;
    private n8nNodeProperties;
    private bindings;
    constructor(doc: any, operationParser: IOperationParser, resourceParser: IResourceParser, logger: pino.Logger);
    get operations(): INodeProperties[];
    get fields(): INodeProperties[];
    visitOperation(operation: OpenAPIV3.OperationObject, context: OperationContext): void;
    _visitOperation(operation: OpenAPIV3.OperationObject, context: OperationContext): void;
    /**
     * Parse fields from operation, both parameters and request body
     */
    parseFields(operation: OpenAPIV3.OperationObject, context: OperationContext): INodeProperties[];
    private addDisplayOption;
    protected parseOperation(operation: OpenAPIV3.OperationObject, context: OperationContext): {
        option: {
            name: string;
            value: string;
            action: string;
            description: string;
            routing: {
                request: {
                    method: string;
                    url: string;
                };
            };
        };
        fields: INodeProperties[];
    };
}
export declare class OperationsCollector extends BaseOperationsCollector {
    protected parseOperation(operation: OpenAPIV3.OperationObject, context: OperationContext): {
        option: {
            name: string;
            value: string;
            action: string;
            description: string;
            routing: {
                request: {
                    method: string;
                    url: string;
                };
            };
        };
        fields: INodeProperties[];
    };
}
