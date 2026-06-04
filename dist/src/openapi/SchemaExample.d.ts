import { OpenAPIV3 } from "openapi-types";
export declare class SchemaExample {
    private resolver;
    constructor(doc: any);
    extractExample(schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject): any;
}
