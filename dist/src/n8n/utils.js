"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replacePathVarsToParameter = replacePathVarsToParameter;
/**
 * /api/entities/{entity} => /api/entities/{{$parameter["entity"]}}
 */
function replacePathVarsToParameter(uri) {
    return uri.replace(/{([^}]*)}/g, '{{$parameter["$1"]}}');
}
//# sourceMappingURL=utils.js.map