import { OpenAPIVisitor, OperationContext } from "./openapi/OpenAPIVisitor";
import { OpenAPIV3 } from "openapi-types";
import { INodeProperties } from "n8n-workflow";
import { IResourceParser } from "./ResourceParser";
/**
 * Collects resource properties from OpenAPI document
 * Resource is basically tags from OpenAPI spec
 */
export declare class ResourceCollector implements OpenAPIVisitor {
    protected resourceParser: IResourceParser;
    private tags;
    private tagsOrder;
    constructor(resourceParser: IResourceParser);
    get resources(): INodeProperties;
    private get sortedTags();
    visitOperation(operation: OpenAPIV3.OperationObject, context: OperationContext): void;
    private addTagByName;
    visitTag(tag: OpenAPIV3.TagObject): void;
}
