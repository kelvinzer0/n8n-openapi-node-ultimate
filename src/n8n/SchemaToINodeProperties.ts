import {OpenAPIV3} from "openapi-types";
import {INodeProperties, NodePropertyTypes} from "n8n-workflow";
import {RefResolver} from "../openapi/RefResolver";
import * as lodash from "lodash";
import {smartStartCase} from "./utils";
import {SchemaExample} from "../openapi/SchemaExample";

type Schema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
type FromSchemaNodeProperty = Pick<INodeProperties, 'type' | 'default' | 'description' | 'options'>;

function combine(...sources: Partial<INodeProperties>[]): INodeProperties {
    const obj = lodash.defaults({}, ...sources)
    if (!obj.required) {
        // n8n does want to have required: false|null|undefined
        delete obj.required
    }
    // Ensure the default value is compatible with the property type.
    // OpenAPI specs sometimes declare schema type as "string" but provide
    // an array or object as the example/default (e.g. Odoo domain filters).
    // Without coercion, the generated TypeScript would contain
    //   default: [["name","ilike","test"]]
    // on a `type: "string"` field, which fails TS2322 because
    // [string, string, string] is not assignable to ResourceMapperValue.
    if (obj.type && obj.default !== undefined && obj.default !== null) {
        obj.default = coerceDefault(obj.type, obj.default);
    }
    return obj
}

/**
 * Coerce a default value so it is compatible with the n8n property type.
 *
 * The key problem: OpenAPI `example` values sometimes do not match the declared
 * schema type. For instance, the Odoo ERP spec declares `domain` as
 * `type: string` but the example is `[["name","ilike","test"]]` (an array).
 * When this mismatched default reaches the generated TypeScript, the tuple
 * type `[string, string, string]` cannot be assigned to `ResourceMapperValue`
 * (a member of the `NodeParameterValueType` union), producing TS2322.
 *
 * Strategy: Only coerce when the value is a non-primitive (array or plain
 * object) that would cause a TypeScript type error. Primitives (string,
 * number, boolean, null) are always valid `NodeParameterValue` members and
 * do not need coercion.
 */
function coerceDefault(type: string, value: any): any {
    const isNonPrimitive = Array.isArray(value) || (typeof value === 'object' && value !== null);

    if (!isNonPrimitive) {
        // Primitives (string, number, boolean, null, undefined) are already
        // valid NodeParameterValue members — no coercion needed.
        return value;
    }

    // Non-primitive values (arrays, objects) must be stringified for all
    // property types that expect a primitive default, because TypeScript
    // infers array literals as tuple types (e.g. [string, string, string])
    // which do not match any member of NodeParameterValueType.
    switch (type) {
        case 'string':
        case 'options':
        case 'notice':
            return JSON.stringify(value);
        case 'json':
            return JSON.stringify(value, null, 2);
        case 'number':
        case 'boolean':
            return JSON.stringify(value);
        default:
            return value;
    }
}

/**
 * in obj find key starts with regexp
 * Return first match VALUE of the key
 */
function findKey(obj: any, regexp: RegExp): any | undefined {
    const key = Object.keys(obj).find((key) => regexp.test(key))
    return key ? obj[key] : undefined
}

/**
 * One level deep - meaning only top fields of the schema
 * The rest represent as JSON string
 */
export class N8NINodeProperties {
    private refResolver: RefResolver;
    private schemaExample: SchemaExample;

    constructor(doc: any) {
        this.refResolver = new RefResolver(doc)
        this.schemaExample = new SchemaExample(doc)
    }

    fromSchema(schema: Schema): FromSchemaNodeProperty {
        const resolved = this.refResolver.resolve<OpenAPIV3.SchemaObject>(schema)
        let type: NodePropertyTypes = 'string';
        let defaultValue = this.schemaExample.extractExample(resolved)

        // Normalize OpenAPI 3.1 union types: type: ['string', 'null'] -> type: 'string'
        const schemaType = Array.isArray(resolved.type)
            ? resolved.type.find((t: string) => t !== 'null') || 'string'
            : resolved.type;

        // Handle allOf composition: merge properties from all schemas
        if (resolved.allOf && Array.isArray(resolved.allOf)) {
            const merged: any = { properties: {}, required: [] };
            for (const sub of resolved.allOf) {
                const subResolved = this.refResolver.resolve<OpenAPIV3.SchemaObject>(sub as any);
                if (subResolved.properties) {
                    Object.assign(merged.properties, subResolved.properties);
                }
                if (subResolved.required) {
                    merged.required.push(...subResolved.required);
                }
                if (subResolved.type && !merged.type) {
                    merged.type = subResolved.type;
                }
            }
            Object.assign(resolved, merged);
        }

        switch (schemaType) {
            case 'boolean':
                type = 'boolean';
                defaultValue = defaultValue !== undefined ? defaultValue : true;
                break;
            case 'string':
            case undefined:
                type = 'string';
                defaultValue = defaultValue !== undefined ? defaultValue : '';
                break;
            case 'object':
                type = 'json';
                defaultValue = defaultValue !== undefined ? JSON.stringify(defaultValue, null, 2) : '{}';
                break;
            case 'array':
                type = 'json';
                defaultValue = defaultValue !== undefined ? JSON.stringify(defaultValue, null, 2) : '[]';
                break;
            case 'number':
            case 'integer':
                type = 'number';
                defaultValue = defaultValue !== undefined ? defaultValue : 0;
                break;
        }

        const field: FromSchemaNodeProperty = {
            type: type,
            default: defaultValue,
            ...(resolved.description !== undefined && { description: resolved.description }),
        };
        if (resolved.enum && resolved.enum.length > 0) {
            field.type = 'options';
            field.options = resolved.enum.map((value: string) => {
                return {
                    name: smartStartCase(value),
                    value: value,
                };
            });
            field.default = field.default ? field.default : resolved.enum[0];
        }
        return field;
    }

    fromParameter(parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject): INodeProperties {
        parameter = this.refResolver.resolve<OpenAPIV3.ParameterObject>(parameter)
        let fieldSchemaKeys
        if (parameter.schema) {
            fieldSchemaKeys = this.fromSchema(parameter.schema!!);
        }
        if (!fieldSchemaKeys) {
            const regexp = /application\/json.*/
            const content = findKey(parameter.content, regexp)
            fieldSchemaKeys = this.fromSchema(content.schema);
        }
        if (!fieldSchemaKeys) {
            throw new Error(`Parameter schema nor content not found`)
        }
        const fieldParameterKeys: Partial<INodeProperties> = {
            displayName: smartStartCase(parameter.name),
            name: encodeURIComponent(parameter.name.replace(/\./g, "-")),
            required: parameter.required,
            ...(parameter.description !== undefined && { description: parameter.description }),
            default: parameter.example,
        };
        const field = combine(fieldParameterKeys, fieldSchemaKeys)

        switch (parameter.in) {
            case "query":
                field.routing = {
                    send: {
                        type: 'query',
                        property: parameter.name,
                        value: '={{ $value }}',
                        propertyInDotNotation: false,
                    },
                };
                break;
            case "path" :
                field.required = true
                break
            case "header":
                field.routing = {
                    request: {
                        headers: {
                            [parameter.name]: '={{ $value }}',
                        },
                    },
                };
                break
            default:
                throw new Error(`Unknown parameter location '${parameter.in}'`);
        }
        if (!field.required) {
            delete field.required
        }
        return field
    }

    fromParameters(parameters: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[] | undefined): INodeProperties[] {
        if (!parameters) {
            return [];
        }
        const fields = [];
        for (const parameter of parameters) {
            const field = this.fromParameter(parameter)
            fields.push(field);
        }
        return fields;
    }

    fromSchemaProperty(name: string, property: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject): INodeProperties {
        const fieldSchemaKeys: FromSchemaNodeProperty = this.fromSchema(property)
        const fieldParameterKeys: Partial<INodeProperties> = {
            displayName: smartStartCase(name),
            name: name.replace(/\./g, "-"),
        }
        const field = combine(fieldParameterKeys, fieldSchemaKeys)
        return field
    }

    fromRequestBody(body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined): INodeProperties[] {
        if (!body) {
            return [];
        }
        body = this.refResolver.resolve<OpenAPIV3.RequestBodyObject>(body)
        const regexp = /application\/json.*/
        const content = findKey(body.content, regexp)
        if (!content) {
            throw new Error(`No '${regexp}' content found`);
        }
        const requestBodySchema = content.schema!!;
        const schema = this.refResolver.resolve<OpenAPIV3.SchemaObject>(requestBodySchema)
        if (!schema.properties && schema.type != 'object' && schema.type != 'array') {
            throw new Error(`Request body schema type '${schema.type}' not supported`);
        }

        const fields = [];
        if (schema.type === "array" && schema.items) {
            const innerSchema = this.refResolver.resolve<OpenAPIV3.SchemaObject>(schema.items)
            const fieldPropertyKeys: FromSchemaNodeProperty = this.fromSchemaProperty("body", innerSchema)
            const fieldDefaults: Partial<INodeProperties> = {
                required: !!schema.required
            }
            const field = combine(fieldDefaults, fieldPropertyKeys)
            field.routing = {
                request: {
                    body: '={{ JSON.parse($value) }}'
                },
            };
            fields.push(field);
        }


        const properties = schema.properties;
        for (const key in properties) {
            const property = properties[key];
            const fieldPropertyKeys: FromSchemaNodeProperty = this.fromSchemaProperty(key, property)
            const fieldDefaults: Partial<INodeProperties> = {
                required: schema.required && schema.required?.includes(key),
            }
            const field = combine(fieldDefaults, fieldPropertyKeys)
            if (field.type === 'json') {
                field.routing = {
                    send: {
                        "property": key,
                        "propertyInDotNotation": false,
                        "type": "body",
                        "value": '={{ JSON.parse($value) }}'
                    },
                };
            } else {
                field.routing = {
                    send: {
                        "property": key,
                        "propertyInDotNotation": false,
                        "type": "body",
                        "value": '={{ $value }}'
                    },
                };
            }
            fields.push(field);
        }
        return fields;
    }
}
