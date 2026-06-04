import { OpenAPIV3 } from "openapi-types";
import { OperationContext } from "./openapi/OpenAPIVisitor";
import { DefaultOperationParser } from "./OperationParser";
import { DefaultResourceParser } from "./ResourceParser";
export declare class CustomOperationParser extends DefaultOperationParser {
    name(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    value(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    action(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
    description(operation: OpenAPIV3.OperationObject, context: OperationContext): string;
}
export declare class CustomResourceParser extends DefaultResourceParser {
    value(tag: OpenAPIV3.TagObject): string;
}
