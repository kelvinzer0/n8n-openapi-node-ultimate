/**
 * Load an OpenAPI spec from a URL (JSON or YAML)
 */
export declare function loadOpenApiFromUrl(url: string): Promise<any>;
/**
 * Load an OpenAPI spec from a local file path (JSON or YAML)
 */
export declare function loadOpenApiFromFile(filePath: string): any;
/**
 * Auto-detect if source is a URL or local file path, then load accordingly
 */
export declare function loadOpenApi(source: string): Promise<any>;
