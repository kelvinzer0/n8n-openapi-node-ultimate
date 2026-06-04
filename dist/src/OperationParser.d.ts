import { OpenAPIV3 } from "openapi-types";
import { OperationContext } from "./openapi/OpenAPIVisitor";
/**
 * Extract information for n8n node from OpenAPI operation
 */
export interface IOperationParser {
    /**
     * Name of the operation (e.g. "Create User")
     */
    name(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    /**
     * Value of the operation (e.g. "create-user")
     */
    value(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    /**
     * Action of the operation (e.g. "Create User") - will be visible in list of actions
     */
    action(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    /**
     * Description of the operation
     */
    description(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    /**
     * Should skip this operation or not
     */
    shouldSkip(operation: OpenAPIV3.OperationObject, context: OperationContext): boolean;
}
/**
 * Default behaviour for OpenAPI to n8n operation parser
 * It will use operationId as name, value and action and summary as description
 * Skip deprecated operations
 */
export declare class DefaultOperationParser implements IOperationParser {
    shouldSkip(operation: OpenAPIV3.OperationObject, context: OperationContext): boolean;
    name(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    value(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    action(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    description(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
}
