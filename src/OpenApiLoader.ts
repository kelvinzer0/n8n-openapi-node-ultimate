import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Load an OpenAPI spec from a URL (JSON or YAML)
 */
export async function loadOpenApiFromUrl(url: string): Promise<any> {
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
export function loadOpenApiFromFile(filePath: string): any {
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
export async function loadOpenApi(source: string): Promise<any> {
    if (isUrl(source)) {
        return loadOpenApiFromUrl(source);
    }
    return loadOpenApiFromFile(source);
}

/**
 * Parse OpenAPI text — auto-detect JSON vs YAML
 */
function parseOpenApiText(text: string, source: string): any {
    const trimmed = text.trim();

    // Try JSON first
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            // Fall through to YAML
        }
    }

    // Try YAML
    try {
        return yaml.load(trimmed) as any;
    } catch (yamlErr) {
        throw new Error(`Failed to parse OpenAPI spec from ${source} as JSON or YAML: ${yamlErr}`);
    }
}

/**
 * Check if a string looks like a URL
 */
function isUrl(source: string): boolean {
    try {
        const url = new URL(source);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}
