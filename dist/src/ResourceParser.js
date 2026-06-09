"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultResourceParser = void 0;
const utils_1 = require("./n8n/utils");
/**
 * Default behaviour for OpenAPI to n8n resource parser
 * It will use tag name as name and value and description as description
 */
class DefaultResourceParser {
    name(tag) {
        return (0, utils_1.smartStartCase)(tag.name);
    }
    value(tag) {
        return (0, utils_1.smartStartCase)(tag.name);
    }
    description(tag) {
        return tag.description || '';
    }
}
exports.DefaultResourceParser = DefaultResourceParser;
//# sourceMappingURL=ResourceParser.js.map