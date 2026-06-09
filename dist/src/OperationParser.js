"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultOperationParser = void 0;
const utils_1 = require("./n8n/utils");
/**
 * Default behaviour for OpenAPI to n8n operation parser
 * It will use operationId as name, value and action and summary as description
 * Skip deprecated operations
 */
class DefaultOperationParser {
    shouldSkip(operation, context) {
        return !!operation.deprecated;
    }
    name(operation, context) {
        if (operation.operationId) {
            return (0, utils_1.smartStartCase)(operation.operationId);
        }
        // Generate a clean name from method + path
        const pathParts = context.pattern
            .split('/')
            .filter(p => p && !p.startsWith('{'))
            .map(p => p.replace(/[^a-zA-Z0-9]/g, ' '));
        const method = context.method.toUpperCase();
        const pathName = pathParts.join(' ');
        return (0, utils_1.smartStartCase)(`${method} ${pathName}`.trim());
    }
    value(operation, context) {
        let name = this.name(operation, context);
        // replace all non-alphanumeric characters with '-'
        return name.replace(/[^a-zA-Z0-9 ]/g, '-');
    }
    action(operation, context) {
        return operation.summary || this.name(operation, context);
    }
    description(operation, context) {
        return operation.description || operation.summary || '';
    }
}
exports.DefaultOperationParser = DefaultOperationParser;
//# sourceMappingURL=OperationParser.js.map