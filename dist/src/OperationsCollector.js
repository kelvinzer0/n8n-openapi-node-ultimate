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
exports.OperationsCollector = exports.BaseOperationsCollector = void 0;
const lodash = __importStar(require("lodash"));
const SchemaToINodeProperties_1 = require("./n8n/SchemaToINodeProperties");
const OptionsByResourceMap_1 = require("./n8n/OptionsByResourceMap");
const utils_1 = require("./n8n/utils");
class BaseOperationsCollector {
    constructor(doc, operationParser, resourceParser, logger) {
        this.operationParser = operationParser;
        this.resourceParser = resourceParser;
        this.logger = logger;
        this.optionsByResource = new OptionsByResourceMap_1.OptionsByResourceMap();
        this._fields = [];
        this.n8nNodeProperties = new SchemaToINodeProperties_1.N8NINodeProperties(doc);
    }
    get operations() {
        if (this.optionsByResource.size === 0) {
            return [];
        }
        const operations = [];
        for (const [resource, options] of this.optionsByResource) {
            const operation = {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: [resource],
                    },
                },
                options: options,
                default: '',
            };
            operations.push(operation);
        }
        return operations;
    }
    get fields() {
        return [...this._fields];
    }
    visitOperation(operation, context) {
        const bindings = {
            operation: {
                pattern: context.pattern,
                method: context.method,
                operationId: operation.operationId
            }
        };
        this.bindings = bindings;
        try {
            this._visitOperation(operation, context);
        }
        catch (error) {
            // @ts-ignore
            const data = { ...this.bindings, error: `${error}` };
            // @ts-ignore
            this.logger.warn(data, 'Failed to parse operation');
        }
    }
    _visitOperation(operation, context) {
        if (this.operationParser.shouldSkip(operation, context)) {
            this.logger.info(this.bindings, 'Skipping operation');
            return;
        }
        const { option, fields: operationFields } = this.parseOperation(operation, context);
        const resources = operation.tags.map((tag) => this.resourceParser.value({ name: tag }));
        for (const resourceName of resources) {
            const fields = lodash.cloneDeep(operationFields);
            const operationName = option.name;
            this.addDisplayOption(fields, resourceName, operationName);
            this.optionsByResource.add(resourceName, option);
            this._fields.push(...fields);
        }
    }
    /**
     * Parse fields from operation, both parameters and request body
     */
    parseFields(operation, context) {
        const fields = [];
        const parameterFields = this.n8nNodeProperties.fromParameters(operation.parameters);
        fields.push(...parameterFields);
        try {
            const bodyFields = this.n8nNodeProperties.fromRequestBody(operation.requestBody);
            fields.push(...bodyFields);
        }
        catch (error) {
            const data = { ...this.bindings, error: `${error}` };
            // @ts-ignore
            this.logger.warn(data, 'Failed to parse request body');
            const msg = "There's no body available for request, kindly use HTTP Request node to send body";
            const notice = {
                displayName: `${context.method.toUpperCase()} ${context.pattern}<br/><br/>${msg}`,
                name: 'operation',
                type: 'notice',
                default: '',
            };
            fields.push(notice);
        }
        return fields;
    }
    addDisplayOption(fields, resource, operation) {
        const displayOptions = {
            show: {
                resource: [resource],
                operation: [operation],
            },
        };
        fields.forEach((field) => {
            field.displayOptions = displayOptions;
        });
    }
    parseOperation(operation, context) {
        const method = context.method;
        const uri = context.pattern;
        const parser = this.operationParser;
        const option = {
            name: parser.name(operation, context),
            value: parser.value(operation, context),
            action: parser.action(operation, context),
            description: parser.description(operation, context),
            routing: {
                request: {
                    method: method.toUpperCase(),
                    url: `=${(0, utils_1.replacePathVarsToParameter)(uri)}`,
                },
            },
        };
        const fields = this.parseFields(operation, context);
        return {
            option: option,
            fields: fields,
        };
    }
}
exports.BaseOperationsCollector = BaseOperationsCollector;
class OperationsCollector extends BaseOperationsCollector {
    parseOperation(operation, context) {
        const result = super.parseOperation(operation, context);
        const notice = {
            displayName: `${context.method.toUpperCase()} ${context.pattern}`,
            name: 'operation',
            type: 'notice',
            typeOptions: {
                theme: 'info',
            },
            default: '',
        };
        result.fields.unshift(notice);
        return result;
    }
}
exports.OperationsCollector = OperationsCollector;
//# sourceMappingURL=OperationsCollector.js.map