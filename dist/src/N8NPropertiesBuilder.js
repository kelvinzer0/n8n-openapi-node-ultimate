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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8NPropertiesBuilder = void 0;
const pino_1 = __importDefault(require("pino"));
const OpenAPIWalker_1 = require("./openapi/OpenAPIWalker");
const ResourceCollector_1 = require("./ResourceCollector");
const OperationsCollector_1 = require("./OperationsCollector");
const lodash = __importStar(require("lodash"));
const OperationParser_1 = require("./OperationParser");
const ResourceParser_1 = require("./ResourceParser");
/**
 *
 * Builds n8n node "properties" from an OpenAPI document.
 * It uses a walker to traverse the OpenAPI document and collect the necessary information.
 * The collected information is then used to build the n8n node properties.
 * The class uses a set of parsers to parse the OpenAPI document and build the n8n node properties.
 *
 */
class N8NPropertiesBuilder {
    constructor(doc, config) {
        this.doc = doc;
        this.logger = (config === null || config === void 0 ? void 0 : config.logger) || (0, pino_1.default)({ transport: { target: 'pino-pretty' } });
        this.walker = new OpenAPIWalker_1.OpenAPIWalker(this.doc);
        // DI
        this.operationParser = (config === null || config === void 0 ? void 0 : config.operation) || new OperationParser_1.DefaultOperationParser();
        this.resourceParser = (config === null || config === void 0 ? void 0 : config.resource) || new ResourceParser_1.DefaultResourceParser();
        this.OperationsCollector = (config === null || config === void 0 ? void 0 : config.OperationsCollector) ? config.OperationsCollector : OperationsCollector_1.OperationsCollector;
        this.ResourcePropertiesCollector = (config === null || config === void 0 ? void 0 : config.ResourcePropertiesCollector) ? config.ResourcePropertiesCollector : ResourceCollector_1.ResourceCollector;
    }
    build(overrides = []) {
        const resourcePropertiesCollector = new this.ResourcePropertiesCollector(this.resourceParser);
        this.walker.walk(resourcePropertiesCollector);
        const resourceNode = resourcePropertiesCollector.resources;
        const operationsCollector = new this.OperationsCollector(this.doc, this.operationParser, this.resourceParser, this.logger);
        this.walker.walk(operationsCollector);
        const operations = operationsCollector.operations;
        const fields = operationsCollector.fields;
        const properties = [resourceNode, ...operations, ...fields];
        return this.update(properties, overrides);
    }
    update(fields, patterns) {
        for (const pattern of patterns) {
            for (const element of lodash.filter(fields, pattern.find)) {
                Object.assign(element, pattern.replace);
            }
        }
        return fields;
    }
}
exports.N8NPropertiesBuilder = N8NPropertiesBuilder;
//# sourceMappingURL=N8NPropertiesBuilder.js.map