"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8NINodeProperties = void 0;
const RefResolver_1 = require("../openapi/RefResolver");
const lodash = __importStar(require("lodash"));
const SchemaExample_1 = require("../openapi/SchemaExample");
function combine(...sources) {
    const obj = lodash.defaults({}, ...sources);
    if (!obj.required) {
        // n8n does want to have required: false|null|undefined
        delete obj.required;
    }
    return obj;
}
/**
 * in obj find key starts with regexp
 * Return first match VALUE of the key
 */
function findKey(obj, regexp) {
    const key = Object.keys(obj).find((key) => regexp.test(key));
    return key ? obj[key] : undefined;
}
/**
 * One level deep - meaning only top fields of the schema
 * The rest represent as JSON string
 */
class N8NINodeProperties {
    constructor(doc) {
        this.refResolver = new RefResolver_1.RefResolver(doc);
        this.schemaExample = new SchemaExample_1.SchemaExample(doc);
    }
    fromSchema(schema) {
        const resolved = this.refResolver.resolve(schema);
        let type = 'string';
        let defaultValue = this.schemaExample.extractExample(resolved);
        // Normalize OpenAPI 3.1 union types: type: ['string', 'null'] -> type: 'string'
        const schemaType = Array.isArray(resolved.type)
            ? resolved.type.find((t) => t !== 'null') || 'string'
            : resolved.type;
        // Handle allOf composition: merge properties from all schemas
        if (resolved.allOf && Array.isArray(resolved.allOf)) {
            const merged = { properties: {}, required: [] };
            for (const sub of resolved.allOf) {
                const subResolved = this.refResolver.resolve(sub);
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
        const field = {
            type: type,
            default: defaultValue,
            description: resolved.description,
        };
        if (resolved.enum && resolved.enum.length > 0) {
            field.type = 'options';
            field.options = resolved.enum.map((value) => {
                return {
                    name: lodash.startCase(value),
                    value: value,
                };
            });
            field.default = field.default ? field.default : resolved.enum[0];
        }
        return field;
    }
    fromParameter(parameter) {
        parameter = this.refResolver.resolve(parameter);
        let fieldSchemaKeys;
        if (parameter.schema) {
            fieldSchemaKeys = this.fromSchema(parameter.schema);
        }
        if (!fieldSchemaKeys) {
            const regexp = /application\/json.*/;
            const content = findKey(parameter.content, regexp);
            fieldSchemaKeys = this.fromSchema(content.schema);
        }
        if (!fieldSchemaKeys) {
            throw new Error(`Parameter schema nor content not found`);
        }
        const fieldParameterKeys = {
            displayName: lodash.startCase(parameter.name),
            name: encodeURIComponent(parameter.name.replace(/\./g, "-")),
            required: parameter.required,
            description: parameter.description,
            default: parameter.example,
        };
        const field = combine(fieldParameterKeys, fieldSchemaKeys);
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
            case "path":
                field.required = true;
                break;
            case "header":
                field.routing = {
                    request: {
                        headers: {
                            [parameter.name]: '={{ $value }}',
                        },
                    },
                };
                break;
            default:
                throw new Error(`Unknown parameter location '${parameter.in}'`);
        }
        if (!field.required) {
            delete field.required;
        }
        return field;
    }
    fromParameters(parameters) {
        if (!parameters) {
            return [];
        }
        const fields = [];
        for (const parameter of parameters) {
            const field = this.fromParameter(parameter);
            fields.push(field);
        }
        return fields;
    }
    fromSchemaProperty(name, property) {
        const fieldSchemaKeys = this.fromSchema(property);
        const fieldParameterKeys = {
            displayName: lodash.startCase(name),
            name: name.replace(/\./g, "-"),
        };
        const field = combine(fieldParameterKeys, fieldSchemaKeys);
        return field;
    }
    fromRequestBody(body) {
        var _a;
        if (!body) {
            return [];
        }
        body = this.refResolver.resolve(body);
        const regexp = /application\/json.*/;
        const content = findKey(body.content, regexp);
        if (!content) {
            throw new Error(`No '${regexp}' content found`);
        }
        const requestBodySchema = content.schema;
        const schema = this.refResolver.resolve(requestBodySchema);
        if (!schema.properties && schema.type != 'object' && schema.type != 'array') {
            throw new Error(`Request body schema type '${schema.type}' not supported`);
        }
        const fields = [];
        if (schema.type === "array" && schema.items) {
            const innerSchema = this.refResolver.resolve(schema.items);
            const fieldPropertyKeys = this.fromSchemaProperty("body", innerSchema);
            const fieldDefaults = {
                required: !!schema.required
            };
            const field = combine(fieldDefaults, fieldPropertyKeys);
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
            const fieldPropertyKeys = this.fromSchemaProperty(key, property);
            const fieldDefaults = {
                required: schema.required && ((_a = schema.required) === null || _a === void 0 ? void 0 : _a.includes(key)),
            };
            const field = combine(fieldDefaults, fieldPropertyKeys);
            if (field.type === 'json') {
                field.routing = {
                    send: {
                        "property": key,
                        "propertyInDotNotation": false,
                        "type": "body",
                        "value": '={{ JSON.parse($value) }}'
                    },
                };
            }
            else {
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
exports.N8NINodeProperties = N8NINodeProperties;
//# sourceMappingURL=SchemaToINodeProperties.js.map