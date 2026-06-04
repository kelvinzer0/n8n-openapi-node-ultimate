import { OpenAPIV3 } from "openapi-types";
import { INodeProperties } from "n8n-workflow";
type Schema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
type FromSchemaNodeProperty = Pick<INodeProperties, 'type' | 'default' | 'description' | 'options'>;
/**
 * One level deep - meaning only top fields of the schema
 * The rest represent as JSON string
 */
export declare class N8NINodeProperties {
    private refResolver;
    private schemaExample;
    constructor(doc: any);
    fromSchema(schema: Schema): FromSchemaNodeProperty;
    fromParameter(parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject): INodeProperties;
    fromParameters(parameters: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[] | undefined): INodeProperties[];
    fromSchemaProperty(name: string, property: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject): INodeProperties;
    fromRequestBody(body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined): INodeProperties[];
}
export {};
