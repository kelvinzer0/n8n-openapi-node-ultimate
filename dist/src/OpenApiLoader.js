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
exports.loadOpenApiFromUrl = loadOpenApiFromUrl;
exports.loadOpenApiFromFile = loadOpenApiFromFile;
exports.loadOpenApi = loadOpenApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
/**
 * Load an OpenAPI spec from a URL (JSON or YAML)
 */
async function loadOpenApiFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch OpenAPI spec from ${url}: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    return parseOpenApiText(text, url);
}
/**
 * Load an OpenAPI spec from a local file path (JSON or YAML)
 */
function loadOpenApiFromFile(filePath) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${resolved}`);
    }
    const text = fs.readFileSync(resolved, 'utf-8');
    return parseOpenApiText(text, resolved);
}
/**
 * Auto-detect if source is a URL or local file path, then load accordingly
 */
async function loadOpenApi(source) {
    if (isUrl(source)) {
        return loadOpenApiFromUrl(source);
    }
    return loadOpenApiFromFile(source);
}
/**
 * Parse OpenAPI text — auto-detect JSON vs YAML
 */
function parseOpenApiText(text, source) {
    const trimmed = text.trim();
    // Try JSON first
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        }
        catch {
            // Fall through to YAML
        }
    }
    // Try YAML
    try {
        return yaml.load(trimmed);
    }
    catch (yamlErr) {
        throw new Error(`Failed to parse OpenAPI spec from ${source} as JSON or YAML: ${yamlErr}`);
    }
}
/**
 * Check if a string looks like a URL
 */
function isUrl(source) {
    try {
        const url = new URL(source);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=OpenApiLoader.js.map