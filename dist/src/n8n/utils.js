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
exports.replacePathVarsToParameter = replacePathVarsToParameter;
exports.smartStartCase = smartStartCase;
/**
 * /api/entities/{entity} => /api/entities/{{$parameter["entity"]}}
 */
function replacePathVarsToParameter(uri) {
    return uri.replace(/{([^}]*)}/g, '{{$parameter["$1"]}}');
}
/**
 * lodash.startCase with proper acronym handling and version formatting.
 * - "api" → "API", "url" → "URL", "http" → "HTTP", "json" → "JSON", "id" → "ID"
 * - " V 1 " → " v1 ", "V 2" → "v2"
 */
const lodash = __importStar(require("lodash"));
// Acronyms that should always be fully uppercase
const ACRONYMS = {
    'Api': 'API',
    'Url': 'URL',
    'Http': 'HTTP',
    'Https': 'HTTPS',
    'Json': 'JSON',
    'Xml': 'XML',
    'Id': 'ID',
    'Ui': 'UI',
    'Db': 'DB',
    'Sql': 'SQL',
    'Ssh': 'SSH',
    'Ftp': 'FTP',
    'Jwt': 'JWT',
    'Cors': 'CORS',
    'Csrf': 'CSRF',
    'Oauth': 'OAuth',
    'Dns': 'DNS',
    'Ssl': 'SSL',
    'Tls': 'TLS',
    'Cdn': 'CDN',
    'Aws': 'AWS',
    'Gcp': 'GCP',
    'Sdk': 'SDK',
    'Cli': 'CLI',
    'Crud': 'CRUD',
    'Rpc': 'RPC',
    'Csv': 'CSV',
    'Pdf': 'PDF',
    'Html': 'HTML',
    'Css': 'CSS',
    'Webhook': 'Webhook', // keep as-is (not an acronym)
    'Graphql': 'GraphQL', // proper casing
};
function smartStartCase(str) {
    // Apply lodash.startCase first (handles word splitting + capitalization)
    let result = lodash.startCase(str);
    // Fix version patterns: "V 1" → "v1", "V 2" → "v2"
    result = result.replace(/\bV\s+(\d+)/g, 'v$1');
    // Fix acronyms that startCase formatted incorrectly
    for (const [from, to] of Object.entries(ACRONYMS)) {
        result = result.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    }
    return result;
}
//# sourceMappingURL=utils.js.map