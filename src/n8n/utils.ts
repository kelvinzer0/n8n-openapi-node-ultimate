/**
 * /api/entities/{entity} => /api/entities/{{$parameter["entity"]}}
 */
export function replacePathVarsToParameter(uri: string): string {
    return uri.replace(/{([^}]*)}/g, '{{$parameter["$1"]}}');
}

/**
 * lodash.startCase with proper acronym handling and version formatting.
 * - "api" → "API", "url" → "URL", "http" → "HTTP", "json" → "JSON", "id" → "ID"
 * - " V 1 " → " v1 ", "V 2" → "v2"
 */
import * as lodash from 'lodash';

// Acronyms that should always be fully uppercase
const ACRONYMS: Record<string, string> = {
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
    'Webhook': 'Webhook',   // keep as-is (not an acronym)
    'Graphql': 'GraphQL',   // proper casing
};

export function smartStartCase(str: string): string {
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
