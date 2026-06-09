#!/usr/bin/env node
/**
 * scaffold-node.mjs: Generate n8n community node project from OpenAPI spec
 *
 * Generates a **declarative** n8n node project matching the n8n-nodes-starter pattern:
 *   nodes/Xxx/
 *     ├── Xxx.node.ts              ← Main declarative node (no execute())
 *     ├── Xxx.node.json            ← Codex metadata
 *     ├── resources/
 *     │   ├── index.ts             ← Re-exports all resources
 *     │   └── resourceName/
 *     │       └── index.ts         ← Operation + field descriptions
 *     └── icons/
 *   credentials/XxxApi.credentials.ts
 *   + config files (tsconfig, prettier, eslint, etc.)
 *
 * Env vars:
 *   OPENAPI_URL     - URL to OpenAPI spec (JSON or YAML)
 *   CUSTOM_NAME     - Name (e.g. "Evolution" → n8n-nodes-evolution)
 *   LOGO_URL        - Optional logo URL (SVG or PNG)
 *   DESCRIPTION     - Optional description
 *   VERSION         - Version (default 1.0.0)
 *   REPO_OWNER      - GitHub repo owner
 *   NPM_SCOPE       - npm scope (default: REPO_OWNER)
 *   CUSTOM_CATEGORY - Codex category (default: "Development")
 *   TEMPLATE_DIR    - Optional custom template directory
 */

import {
	readFileSync,
	writeFileSync,
	mkdirSync,
	existsSync,
	cpSync,
	readdirSync,
	statSync,
} from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function copyDirSync(src, dest) {
	mkdirSync(dest, { recursive: true });
	for (const entry of readdirSync(src)) {
		const srcPath = join(src, entry);
		const destPath = join(dest, entry);
		if (statSync(srcPath).isDirectory()) {
			copyDirSync(srcPath, destPath);
		} else {
			cpSync(srcPath, destPath);
		}
	}
}

function toPascalCase(str) {
	const result = str
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.split(' ')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join('');
	// TypeScript identifiers can't start with a digit — prefix with 'N' if needed
	if (/^[0-9]/.test(result)) {
		return 'N' + result;
	}
	return result;
}

/**
 * Convert a raw name to a proper display name for n8n.
 * - Preserves acronyms (API, URL, HTTP, JSON, ID, OAuth, GraphQL, etc.)
 * - Fixes version format: "V 1" → "v1"
 * - "binance" → "Binance", "walletobjects-pay-passes" → "WalletObjects Pay Passes"
 * - "evolution api" → "Evolution API", "my cool service" → "My Cool Service"
 */
const DISPLAY_ACRONYMS = {
	'api': 'API', 'url': 'URL', 'http': 'HTTP', 'https': 'HTTPS',
	'json': 'JSON', 'xml': 'XML', 'id': 'ID', 'ui': 'UI', 'db': 'DB',
	'sql': 'SQL', 'ssh': 'SSH', 'ftp': 'FTP', 'jwt': 'JWT',
	'oauth': 'OAuth', 'cors': 'CORS', 'csrf': 'CSRF', 'dns': 'DNS',
	'ssl': 'SSL', 'tls': 'TLS', 'cdn': 'CDN', 'aws': 'AWS', 'gcp': 'GCP',
	'sdk': 'SDK', 'cli': 'CLI', 'crud': 'CRUD', 'rpc': 'RPC',
	'graphql': 'GraphQL', 'webhook': 'Webhook', 'csv': 'CSV', 'pdf': 'PDF',
	'html': 'HTML', 'css': 'CSS', 'pay': 'Pay', 'pass': 'Pass', 'passes': 'Passes',
	'wallet': 'Wallet', 'objects': 'Objects', 'walletobjects': 'WalletObjects',
	'n8n': 'n8n', 'openai': 'OpenAI', 'stripe': 'Stripe', 'github': 'GitHub',
	'gitlab': 'GitLab', 'bitbucket': 'Bitbucket', 'cloudflare': 'Cloudflare',
	'sendgrid': 'SendGrid', 'mailchimp': 'Mailchimp', 'twilio': 'Twilio',
	'shopify': 'Shopify', 'woocommerce': 'WooCommerce', 'wordpress': 'WordPress',
	'mongodb': 'MongoDB', 'postgresql': 'PostgreSQL', 'mysql': 'MySQL',
	'redis': 'Redis', 'elasticsearch': 'Elasticsearch',
};

function toDisplayName(str) {
	// Split on spaces, hyphens, underscores
	const words = str.replace(/[-_]+/g, ' ').split(/\s+/).filter(Boolean);
	return words.map(w => {
		const lower = w.toLowerCase();
		if (DISPLAY_ACRONYMS[lower]) return DISPLAY_ACRONYMS[lower];
		// Check if already mixed case (e.g. "Binance") — preserve it
		if (w !== w.toLowerCase() && w !== w.toUpperCase()) return w;
		return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
	}).join(' ');
}

function toJSON(obj, indent = 2) {
	return JSON.stringify(obj, null, indent) + '\n';
}

/**
 * Serialize a JS object to a TypeScript object literal string.
 * Handles n8n property objects with nested structures, arrays, expressions.
 * Uses JSON.stringify since JSON syntax is valid TypeScript object literal syntax.
 */
function toTSLiteral(obj, indent = '\t') {
	if (obj === undefined || obj === null) return 'null';
	return JSON.stringify(obj, null, '\t')
		.split('\n')
		.map((line, i) => (i === 0 ? line : indent + line))
		.join('\n');
}

/**
 * Convert a tag/resource name to a safe directory name (lowercase, hyphenated).
 */
function toDirName(tagName) {
	return tagName
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}

/**
 * Convert a tag/resource name to a safe TypeScript identifier (camelCase).
 */
function toIdentifier(tagName) {
	const pascal = toPascalCase(tagName);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Escape a string for use inside a TypeScript single-quoted string literal.
 */
function escapeTS(str) {
	return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Generate a banner SVG from template.svg by replacing placeholders.
 * @param {string} title - Banner title (will be uppercased, dashes → spaces)
 * @param {string} description - Banner description text
 * @param {Buffer|null} logoBuf - Logo image buffer (PNG/JPG/SVG)
 * @param {string} logoExt - Logo file extension (e.g. '.png', '.svg')
 * @param {string} outPath - Output SVG path
 */
async function generateBanner(title, description, logoBuf, logoExt, outPath) {
	const templatePath = join(__dirname, 'template.svg');
	if (!existsSync(templatePath)) {
		console.log('⚠️  template.svg not found in scripts/, skipping banner generation');
		return;
	}

	// Load fonts for text-to-path conversion
	const { loadFonts, wrapTextWithFont, renderTextAsPaths, textToPathElement } = await import('./text-to-path.mjs');
	const fonts = await loadFonts();

	/**
	 * Robust text → SVG path conversion.
	 * Uses textToPathElement (with GSUB fallback) for short text,
	 * renderTextAsPaths (char-by-char) for multi-line description.
	 */
	function getTextPaths(font, text, x, y, fontSize, fill, fillOpacity) {
		return textToPathElement(font, text, fontSize, x, y, fill, fillOpacity);
	}
	function getTextPathsRobust(font, text, x, y, fontSize, fill, fillOpacity) {
		return renderTextAsPaths(font, text, x, y, fontSize, fill, fillOpacity);
	}

	let svg = readFileSync(templatePath, 'utf-8');

	// 1. Replace title — uppercase, dashes → spaces, convert to path
	const displayTitle = title.replace(/-/g, ' ').toUpperCase();
	const titleSvg = getTextPaths(fonts.medium, displayTitle, 62, 136.06, 96, 'url(#paint2_linear_0_1)');
	svg = svg.replace(
		/(<text[^>]*id="placeholder-name"[^>]*>)[\s\S]*?(<\/text>)/,
		titleSvg,
	);

	// 2. Replace description — wrap using font metrics, convert to paths
	// Available width: x=70 to logo at x=1229 → ~1159px
	// Available height: startY(197.64) to copyright(334.52) = ~137px, lineHeight 32px → max 4 lines
	const maxDescWidth = 1100;
	const lineHeight = 32;
	const startY = 197.64;
	const maxLines = 4;

	let lines = wrapTextWithFont(fonts.regular, description, 24, maxDescWidth);
	if (lines.length > maxLines) {
		lines = lines.slice(0, maxLines);
		// Truncate last line with '..' if cut short
		const lastLine = lines[maxLines - 1];
		lines[maxLines - 1] = lastLine.slice(0, -3).trimEnd() + '..';
	}

	const descPaths = lines
		.map((line, i) => {
			const y = startY + i * lineHeight;
			return getTextPathsRobust(fonts.regular, line, 70, y, 24, 'white', '0.7');
		})
		.join('\n');
	svg = svg.replace(
		/(<text[^>]*id="placeholder-description"[^>]*>)[\s\S]*?(<\/text>)/,
		descPaths,
	);

	// 3. Replace copyright text — "N8N" (bold) + " - COMMUNITY NODES" (regular)
	// Both at font-size 32, y=334.52
	const n8nSvg = getTextPaths(fonts.bold, 'N8N', 70, 334.52, 32, 'white', '0.9');
	const communitySvg = getTextPathsRobust(fonts.regular, ' - COMMUNITY NODES', 127.562, 334.52, 32, 'white', '0.9');

	svg = svg.replace(
		/(<g id="copyright">)[\s\S]*?(<\/g>)/,
		`$1\n${n8nSvg}\n${communitySvg}\n$2`,
	);

	// 3. Replace logo
	if (logoBuf) {
		const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(logoExt);
		if (isImage) {
			const mime =
				{ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }[logoExt] || 'image/png';
			const base64 = logoBuf.toString('base64');
			svg = replaceLogoGroup(svg, `<image href="data:${mime};base64,${base64}" x="1229" y="48" width="300" height="300" preserveAspectRatio="xMidYMid meet"/>`);
		} else {
			// SVG — extract inner content and embed with scaling
			const logoSvg = logoBuf.toString('utf-8');
			const innerMatch = logoSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
			if (innerMatch) {
				const inner = innerMatch[1].trim();
				let logoW = 0, logoH = 0;
				const vbMatch = logoSvg.match(/viewBox="([^"]*)"/);
				if (vbMatch) {
					const parts = vbMatch[1].split(/[\s,]+/).map(Number);
					logoW = parts[2]; logoH = parts[3];
				}
				if (!logoW || !logoH) {
					const wMatch = logoSvg.match(/\bwidth="(\d[\d.]*)"/);
					const hMatch = logoSvg.match(/\bheight="(\d[\d.]*)"/);
					if (wMatch) logoW = parseFloat(wMatch[1]);
					if (hMatch) logoH = parseFloat(hMatch[1]);
				}
				let scale = 1, offsetX = 0, offsetY = 0;
				if (logoW && logoH) {
					scale = Math.min(300 / logoW, 300 / logoH);
					offsetX = (300 - logoW * scale) / 2;
					offsetY = (300 - logoH * scale) / 2;
				}
				svg = replaceLogoGroup(svg, `<g transform="translate(1229,48) translate(${offsetX.toFixed(1)},${offsetY.toFixed(1)}) scale(${scale.toFixed(4)})">${inner}</g>`);
			}
		}
	}

	writeFileSync(outPath, svg);
	console.log('🎨 Banner generated: banner.svg');
}

/** Replace the inner content of #placeholder-logo group (nested-group aware) */
function replaceLogoGroup(svg, newInner) {
	const logoOpenMatch = svg.match(/<g[^>]*id="placeholder-logo"[^>]*>/);
	if (!logoOpenMatch) return svg;
	const startIdx = svg.indexOf(logoOpenMatch[0]);
	const afterOpen = startIdx + logoOpenMatch[0].length;
	let depth = 1;
	let pos = afterOpen;
	while (depth > 0 && pos < svg.length) {
		const nextOpen = svg.indexOf('<g', pos);
		const nextClose = svg.indexOf('</g>', pos);
		if (nextClose === -1) break;
		if (nextOpen !== -1 && nextOpen < nextClose) {
			const tagEnd = svg.indexOf('>', nextOpen);
			if (svg[tagEnd - 1] !== '/') depth++;
			pos = tagEnd + 1;
		} else {
			depth--;
			if (depth === 0) {
				return svg.slice(0, afterOpen) + newInner + svg.slice(nextClose);
			}
			pos = nextClose + 4;
		}
	}
	return svg;
}

function escapeXml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text, maxLen) {
	const words = text.split(/\s+/);
	const lines = [];
	let current = '';
	for (const word of words) {
		if (current.length + word.length + 1 > maxLen && current.length > 0) {
			lines.push(current);
			current = word;
		} else {
			current = current ? `${current} ${word}` : word;
		}
	}
	if (current) lines.push(current);
	return lines;
}

// ─── CLI args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name) {
	const idx = args.indexOf(name);
	return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

// ─── Env ────────────────────────────────────────────────────────────────────────

const OPENAPI_URL = process.env.OPENAPI_URL;
const CUSTOM_NAME = process.env.CUSTOM_NAME || 'Custom';
const LOGO_URL = process.env.LOGO_URL || '';
const DESCRIPTION = process.env.DESCRIPTION || '';
const VERSION = process.env.VERSION || '1.0.0';
const REPO_OWNER = process.env.REPO_OWNER || 'unknown';
const NPM_SCOPE = process.env.NPM_SCOPE || REPO_OWNER;
const GITHUB_ORG = process.env.GITHUB_ORG || NPM_SCOPE || REPO_OWNER;
const CUSTOM_CATEGORY = process.env.CUSTOM_CATEGORY || 'Development';
const TEMPLATE_DIR = getArg('--template-dir') || process.env.TEMPLATE_DIR || '';

if (!OPENAPI_URL) {
	console.error('❌ OPENAPI_URL is required');
	process.exit(1);
}
if (!CUSTOM_NAME) {
	console.error('❌ CUSTOM_NAME is required');
	process.exit(1);
}

// ─── Normalize names ─────────────────────────────────────────────────────────────

const safeName = CUSTOM_NAME.toLowerCase()
	.replace(/[^a-z0-9-]/g, '-')
	.replace(/-+/g, '-')
	.replace(/^-|-$/g, '');
const nodeName = `n8n-nodes-${safeName}`;
const className = toPascalCase(CUSTOM_NAME);
const packageName = `@${NPM_SCOPE}/${nodeName}`;
const defaultDesc = DESCRIPTION || `n8n community node for ${toDisplayName(CUSTOM_NAME)}${toDisplayName(CUSTOM_NAME).toUpperCase().endsWith('API') ? '' : ' API'}`;
const nodeClassName = className;
const credentialClassName = `${className}Api`;

// Unique node/credential names using scope prefix to avoid conflicts with other devs
// e.g. scope="n8n-dev", name="Evolution" → nodeInternalName="n8nDevEvolution"
const scopePrefix = toPascalCase(NPM_SCOPE.replace(/^@/, ''));
const nodeInternalName = `${scopePrefix}${className}`;
const credentialInternalName = `${nodeInternalName}Api`;

console.log(`\n${'='.repeat(60)}`);
console.log(`  Scaffolding: ${nodeName} (declarative)`);
console.log(`${'='.repeat(60)}\n`);

// ─── Fetch OpenAPI spec ──────────────────────────────────────────────────────────

console.log(`📥 Fetching OpenAPI spec from ${OPENAPI_URL}...`);
let specText;
if (OPENAPI_URL.startsWith('file://') || OPENAPI_URL.startsWith('/') || OPENAPI_URL.startsWith('./')) {
	const filePath = OPENAPI_URL.replace('file://', '');
	specText = readFileSync(filePath, 'utf-8');
	console.log('📂 Source: local file');
} else {
	const resp = await fetch(OPENAPI_URL);
	if (!resp.ok) {
		console.error(`❌ Failed to fetch: ${resp.status}`);
		process.exit(1);
	}
	specText = await resp.text();
}
let spec;
try {
	spec = JSON.parse(specText);
	console.log('📄 Format: JSON');
} catch {
	try {
		const yaml = await import('js-yaml');
		spec = yaml.default.load(specText);
		console.log('📄 Format: YAML');
	} catch {
		console.error('❌ Cannot parse spec as JSON or YAML');
		process.exit(1);
	}
}
writeFileSync('openapi.json', JSON.stringify(spec, null, 2));
console.log('✅ OpenAPI spec saved\n');

// ─── Extract base URL from OpenAPI servers ───────────────────────────────────────

function extractBaseUrl(spec) {
	const servers = spec.servers;
	if (!servers || servers.length === 0) return '';

	const server = servers[0];
	let url = server.url || '';

	// Replace server variables with their defaults
	if (server.variables) {
		for (const [varName, varDef] of Object.entries(server.variables)) {
			const defaultVal = varDef.default || '';
			url = url.replace(`{${varName}}`, defaultVal);
		}
	}

	// If URL still has unresolved variables, return raw template for placeholder use
	if (url.includes('{')) return url;
	return url;
}

/**
 * Check if the OpenAPI spec has server variables (meaning the base URL is dynamic).
 */
function hasServerVariables(spec) {
	const servers = spec.servers;
	if (!servers || servers.length === 0) return false;
	return !!servers[0].variables && Object.keys(servers[0].variables).length > 0;
}

const specBaseUrl = extractBaseUrl(spec);
const specHasServerVars = hasServerVariables(spec);

// ─── Extract security scheme info ────────────────────────────────────────────────

function extractSecurityInfo(spec) {
	const schemes = spec.components?.securitySchemes || {};
	const globalSecurity = spec.security || [];

	// Find the first security scheme
	for (const secRef of globalSecurity) {
		const schemeName = Object.keys(secRef)[0];
		if (schemes[schemeName]) {
			return { name: schemeName, ...schemes[schemeName] };
		}
	}

	// If no global security, check if any scheme exists
	const firstScheme = Object.entries(schemes)[0];
	if (firstScheme) {
		return { name: firstScheme[0], ...firstScheme[1] };
	}

	return null;
}

const secInfo = extractSecurityInfo(spec);

// ─── Generate properties via N8NPropertiesBuilder ────────────────────────────────

console.log('🔧 Generating n8n node properties...');
const __dirname = dirname(fileURLToPath(import.meta.url));
const { N8NPropertiesBuilder } = await import(
	join(__dirname, '..', 'dist', 'src', 'index.js')
);
const parser = new N8NPropertiesBuilder(spec);
const properties = parser.build();
writeFileSync('properties.json', toJSON(properties));
console.log(`✅ Generated ${properties.length} properties\n`);

// ─── Generate credential test request from OpenAPI spec ──────────────────────────

console.log('🔑 Generating credential test request...');
const credentialTestRequest = parser.buildCredentialTestRequest();
if (credentialTestRequest) {
	console.log(`✅ Credential test: ${credentialTestRequest.request.method} ${credentialTestRequest.request.url}`);
} else {
	console.log('⚠️  No GET endpoints found, using fallback credential test');
}

// ─── Group properties by resource ────────────────────────────────────────────────

// The first property is the resource selector
const resourceProperty = properties[0];

// Get resource names from the selector
const resourceNames = resourceProperty.options.map((opt) => opt.value);

// Group remaining properties by resource
const propertiesByResource = new Map();
for (const name of resourceNames) {
	propertiesByResource.set(name, []);
}

for (let i = 1; i < properties.length; i++) {
	const prop = properties[i];
	const show = prop.displayOptions?.show;
	if (show?.resource) {
		// Property belongs to specific resource(s)
		for (const res of show.resource) {
			if (propertiesByResource.has(res)) {
				propertiesByResource.get(res).push(prop);
			}
		}
	} else {
		// Global property: add to all resources
		for (const [name, props] of propertiesByResource) {
			props.push(prop);
		}
	}
}

console.log('📊 Resources found:');
for (const [name, props] of propertiesByResource) {
	const operations = props.filter((p) => p.name === 'operation');
	const fields = props.filter((p) => p.name !== 'operation');
	console.log(`   ${name}: ${operations.length} operation(s), ${fields.length} field(s)`);
}
console.log('');

// ─── Create project ──────────────────────────────────────────────────────────────

console.log(`📦 Creating project: ${nodeName}...`);
const projectDir = nodeName;
if (!existsSync(projectDir)) mkdirSync(projectDir, { recursive: true });

// Determine icon filenames
const iconSlug = safeName.replace(/^n8n-nodes-/, '');
const iconLight = `${iconSlug}.svg`;
const iconDark = `${iconSlug}.dark.svg`;

// Actual icon filenames (may change if logo is PNG/JPG)
let actualIconLight = iconLight;
let actualIconDark = iconDark;

// ─── Pre-detect icon format from LOGO_URL (before writing credential/node files) ──
if (LOGO_URL) {
	try {
		const headResp = await fetch(LOGO_URL, { method: 'HEAD' });
		const contentType = headResp.headers.get('content-type') || '';
		const ext = extname(new URL(LOGO_URL).pathname).toLowerCase();

		const isPng = contentType.includes('png') || ext === '.png';
		const isJpg = contentType.includes('jpeg') || ext === '.jpg' || ext === '.jpeg';

		if (isPng || isJpg) {
			const realExt = isPng ? '.png' : '.jpg';
			actualIconLight = iconLight.replace('.svg', realExt);
			actualIconDark = iconDark.replace('.svg', realExt);
			console.log(`🔍 Logo format detected: ${realExt}`);
		}
	} catch {
		// Gagal HEAD request, biarkan default .svg — download block di bawah akan handle
	}
}

// ─── package.json ────────────────────────────────────────────────────────────────

const packageJson = {
	name: packageName,
	version: VERSION,
	description: defaultDesc,
	license: 'MIT',
	homepage: `https://${GITHUB_ORG}.github.io/${NPM_SCOPE}/#/${nodeName}`,
	keywords: [
		'n8n',
		'n8n-community-node',
		'n8n-node',
		'n8n-community-node-package',
		'openapi',
		'swagger',
		'API',
		'automation',
		'workflow',
		safeName,
	],
	author: { name: REPO_OWNER, email: '' },
	repository: {
		type: 'git',
		url: `https://github.com/${GITHUB_ORG}/${nodeName}.git`,
	},
	scripts: {
		build: 'n8n-node build',
		'build:watch': 'tsc --watch',
		dev: 'n8n-node dev',
		lint: 'n8n-node lint',
		'lint:fix': 'n8n-node lint --fix',
		release: 'n8n-node release',
		prepublishOnly: 'npm run build',
	},
	files: ['dist'],
	n8n: {
		n8nNodesApiVersion: 1,
		strict: true,
		credentials: [`dist/credentials/${credentialClassName}.credentials.js`],
		nodes: [`dist/nodes/${nodeClassName}/${nodeClassName}.node.js`],
	},
	dependencies: {
		'n8n-workflow': '*',
	},
	devDependencies: {
		'@n8n/node-cli': '*',
		eslint: '*',
		prettier: '3.8.3',
		'release-it': '20.2.0',
		typescript: '5.9.3',
	},
	peerDependencies: {
		'n8n-workflow': '*',
	},
};

writeFileSync(join(projectDir, 'package.json'), toJSON(packageJson));

// ─── tsconfig.json (exact match with n8n-nodes-starter) ──────────────────────────

const tsconfigJson = {
	compilerOptions: {
		strict: true,
		module: 'commonjs',
		moduleResolution: 'node',
		target: 'es2019',
		lib: ['es2019', 'es2020', 'es2022.error'],
		removeComments: true,
		useUnknownInCatchVariables: false,
		forceConsistentCasingInFileNames: true,
		noImplicitAny: true,
		noImplicitReturns: true,
		noUnusedLocals: true,
		strictNullChecks: true,
		preserveConstEnums: true,
		esModuleInterop: true,
		resolveJsonModule: true,
		incremental: true,
		declaration: true,
		sourceMap: true,
		skipLibCheck: true,
		outDir: './dist/',
	},
	include: [
		'credentials/**/*',
		'nodes/**/*',
		'nodes/**/*.json',
		'package.json',
	],
};

writeFileSync(join(projectDir, 'tsconfig.json'), toJSON(tsconfigJson));

// ─── .gitignore (matches starter: dist + node_modules) ──────────────────────────

writeFileSync(join(projectDir, '.gitignore'), 'dist\nnode_modules\n');

// ─── .prettierrc.js (matches starter exactly) ───────────────────────────────────

writeFileSync(
	join(projectDir, '.prettierrc.js'),
	`module.exports = {
	/**
	 * https://prettier.io/docs/en/options.html#semicolons
	 */
	semi: true,

	/**
	 * https://prettier.io/docs/en/options.html#trailing-commas
	 */
	trailingComma: 'all',

	/**
	 * https://prettier.io/docs/en/options.html#bracket-spacing
	 */
	bracketSpacing: true,

	/**
	 * https://prettier.io/docs/en/options.html#tabs
	 */
	useTabs: true,

	/**
	 * https://prettier.io/docs/en/options.html#tab-width
	 */
	tabWidth: 2,

	/**
	 * https://prettier.io/docs/en/options.html#arrow-function-parentheses
	 */
	arrowParens: 'always',

	/**
	 * https://prettier.io/docs/en/options.html#quotes
	 */
	singleQuote: true,

	/**
	 * https://prettier.io/docs/en/options.html#quote-props
	 */
	quoteProps: 'as-needed',

	/**
	 * https://prettier.io/docs/en/options.html#end-of-line
	 */
	endOfLine: 'lf',

	/**
	 * https://prettier.io/docs/en/options.html#print-width
	 */
	printWidth: 100,
};
`,
);

// ─── eslint.config.mjs (matches starter) ────────────────────────────────────────

writeFileSync(
	join(projectDir, 'eslint.config.mjs'),
	`import { config } from '@n8n/node-cli/eslint';

export default config;
`,
);

// ─── .vscode/extensions.json ────────────────────────────────────────────────────

mkdirSync(join(projectDir, '.vscode'), { recursive: true });
writeFileSync(
	join(projectDir, '.vscode', 'extensions.json'),
	toJSON({
		recommendations: [
			'dbaeumer.vscode-eslint',
			'EditorConfig.EditorConfig',
			'esbenp.prettier-vscode',
		],
	}),
);

// ─── .vscode/launch.json ───────────────────────────────────────────────────────

writeFileSync(
	join(projectDir, '.vscode', 'launch.json'),
	toJSON({
		version: '0.2.0',
		configurations: [
			{
				name: 'Attach to running n8n',
				processId: '${command:PickProcess}',
				request: 'attach',
				skipFiles: ['<node_internals>/**'],
				type: 'node',
			},
		],
	}),
);

// ─── Credential file ─────────────────────────────────────────────────────────────

mkdirSync(join(projectDir, 'credentials'), { recursive: true });

// Build credential fields based on security scheme
// ALWAYS include a Base URL field so users can override the API endpoint.
// The OpenAPI spec's server URL is used as default/placeholder only.
const FUNDING_NOTICE = {
  displayName:
    '❤️ Keep It Moving: One developer built a tool that auto-generates n8n nodes from any OpenAPI spec. Your donation funds new features, more API support, and better tooling for every developer after you. <a href="https://n8n-code.github.io/membership/#/eyJ0aXRsZSI6IktlZXAgSXQgTW92aW5nIiwiZGVzYyI6Ik9uZSBkZXZlbG9wZXIgYnVpbHQgYSB0b29sIHRoYXQgYXV0by1nZW5lcmF0ZXNcbm44biBub2RlcyBmcm9tIGFueSBPcGVuQVBJIHNwZWMuXG5cbllvdXIgZG9uYXRpb24gZnVuZHMgbmV3IGZlYXR1cmVzLCBtb3JlIEFQSSBzdXBwb3J0LFxuYW5kIGJldHRlciB0b29saW5nIGZvciBldmVyeSBkZXZlbG9wZXIgYWZ0ZXIgeW91LiIsInRhcmdldCI6NTAwMCwiYWRkcmVzc2VzIjp7ImV0aGVyZXVtIjoiMHhmMDU1NWQ0MGRiRkI0ZTNCZjA3MDQ0MjgyQjc4RjJmRTFmNTFFZjcyIiwic29sYW5hIjoiNlpEVk5BYmpZZExEcXo4cGt3VUNHYllaNVV3QlFranB0QzU1Wk5vTFcybVUifSwiZGlzY29yZCI6Imh0dHBzOi8vZGlzY29yZC5nZy9wdERaOGU0aDkzIn0" target="_blank">☕ Buy me a coffee</a>',
  name: 'n8nCodeNotice',
  type: 'notice',
  default: '',
  displayOptions: {
    show: {},
  },
};


let credFields = '';
let authConfig = '';

// Credential display name: avoid "API API" duplication
const displayNameStr = toDisplayName(CUSTOM_NAME);
const credDisplayName = displayNameStr.toUpperCase().endsWith('API')
	? displayNameStr
	: `${displayNameStr} API`;
const credDescPrefix = displayNameStr.toUpperCase().endsWith('API')
	? displayNameStr
	: `${displayNameStr} API`;

// Determine the default URL value and placeholder from the spec
const defaultUrlValue = specBaseUrl && !specHasServerVars ? specBaseUrl : '';
const urlPlaceholder = specBaseUrl || 'https://api.example.com';

if (secInfo && secInfo.type === 'apiKey') {
	const headerName = secInfo.name || 'Authorization';
	credFields = `		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: '${escapeTS(defaultUrlValue)}',
			required: true,
			placeholder: '${escapeTS(urlPlaceholder)}',
			description: 'The base URL of your ${escapeTS(credDescPrefix)} server',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: false,
		},
		${toTSLiteral(FUNDING_NOTICE, '\t\t')}`;
	authConfig = `	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				${headerName === 'Authorization' ? "Authorization: '=Bearer {{$credentials.apiKey}}'" : `'${headerName}': '={{$credentials.apiKey}}'`},
			},
		},
	};`;
} else if (secInfo && secInfo.type === 'http') {
	credFields = `		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: '${escapeTS(defaultUrlValue)}',
			required: true,
			placeholder: '${escapeTS(urlPlaceholder)}',
			description: 'The base URL of your ${escapeTS(credDescPrefix)} server',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: false,
		},
		${toTSLiteral(FUNDING_NOTICE, '\t\t')}`;
	authConfig = `	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};`;
} else {
	// Default: API key + base URL
	credFields = `		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: '${escapeTS(defaultUrlValue)}',
			required: true,
			placeholder: '${escapeTS(urlPlaceholder)}',
			description: 'The base URL of your ${escapeTS(credDescPrefix)} server',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: false,
		},
		${toTSLiteral(FUNDING_NOTICE, '\t\t')}`;
	authConfig = `	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};`;
}

// Build credential test request from OpenAPI spec (auto-selects best GET endpoint)
// Remap credential field names to match scaffold-generated field names:
//   $credentials.baseUrl → $credentials.url
//   $credentials.<anySchemeName> → $credentials.apiKey (scaffold always uses 'apiKey')
function remapCredTestExpressions(obj) {
	if (typeof obj === 'string') {
		// First remap baseUrl → url, then any remaining scheme refs → apiKey
		return obj
			.replace(/\$credentials\.baseUrl/g, '$credentials.url')
			.replace(/\$credentials\.(?!url\b)[a-zA-Z_][a-zA-Z0-9_]*/g, '$credentials.apiKey');
	}
	if (Array.isArray(obj)) return obj.map(item => remapCredTestExpressions(item));
	if (obj && typeof obj === 'object') {
		const result = {};
		for (const [key, val] of Object.entries(obj)) {
			result[key] = remapCredTestExpressions(val);
		}
		return result;
	}
	return obj;
}

let credTestObj;
if (credentialTestRequest) {
	const remapped = remapCredTestExpressions(credentialTestRequest);
	credTestObj = toTSLiteral(remapped, '\t\t');
} else {
	credTestObj = `{
			request: {
				baseURL: '={{$credentials.url}}',
				url: '/',
				method: 'GET',
			},
		}`;
}

writeFileSync(
	join(projectDir, 'credentials', `${credentialClassName}.credentials.ts`),
	`import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ${credentialClassName} implements ICredentialType {
	name = '${credentialInternalName}';

	displayName = '${credDisplayName}';

	icon: Icon = { light: 'file:../nodes/${nodeClassName}/${actualIconLight}', dark: 'file:../nodes/${nodeClassName}/${actualIconDark}' };

	documentationUrl = '';

	properties: INodeProperties[] = [
${credFields}
	];

${authConfig}


}
`,
);

// ─── Node directory: nodes/Xxx/ ──────────────────────────────────────────────────

const nodeDir = join(projectDir, 'nodes', nodeClassName);
mkdirSync(nodeDir, { recursive: true });

// ─── Generate resource directories ───────────────────────────────────────────────

const resourcesDir = join(nodeDir, 'resources');
mkdirSync(resourcesDir, { recursive: true });

const resourceImports = [];
const resourceSpreads = [];
const generatedResources = new Set();

for (const [resourceName, resourceProps] of propertiesByResource) {
	const dirName = toDirName(resourceName);
	const identifier = toIdentifier(resourceName);
	const constName = `${identifier}Description`;
	const resourceDir = join(resourcesDir, dirName);
	mkdirSync(resourceDir, { recursive: true });

	// Filter out undefined/null and serialize to TypeScript
	const validProps = resourceProps.filter((p) => p != null);
	if (validProps.length === 0) {
		// Skip resources with zero properties
		continue;
	}
	generatedResources.add(resourceName);

	const propsTS = validProps
		.map((p) => toTSLiteral(p, '\t\t'))
		.join(',\n\t\t');

	writeFileSync(
		join(resourceDir, 'index.ts'),
		`import type { INodeProperties } from 'n8n-workflow';

export const ${constName}: INodeProperties[] = [
		${propsTS},
];
`,
	);

	resourceImports.push(
		`import { ${constName} } from './resources/${dirName}';`,
	);
	resourceSpreads.push(`...${constName}`);
}

// ─── resources/index.ts (re-export all resources) ───────────────────────────────

const reExports = [];
for (const resourceName of generatedResources) {
	const dirName = toDirName(resourceName);
	const identifier = toIdentifier(resourceName);
	const constName = `${identifier}Description`;
	reExports.push(`export { ${constName} } from './${dirName}';`);
}

writeFileSync(
	join(resourcesDir, 'index.ts'),
	reExports.join('\n') + '\n',
);

// ─── Xxx.node.ts (main declarative node: NO execute()) ─────────────────────────

// Serialize the resource selector property: only include generated resources
const filteredResourceProperty = {
	...resourceProperty,
	options: resourceProperty.options.filter((opt) => generatedResources.has(opt.value)),
};
const resourcePropTS = toTSLiteral(filteredResourceProperty, '\t\t');

// Build the properties array content: resource selector + all resource spreads
// Filter out any undefined/null spreads
const validSpreads = resourceSpreads.filter((s) => s != null);
const propertiesContent = `\t\t${resourcePropTS},\n\t\t${validSpreads.join(',\n\t\t')}`;

// Determine credential name
const credName = credentialInternalName;

writeFileSync(
	join(nodeDir, `${nodeClassName}.node.ts`),
	`import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
${resourceImports.join('\n')}

export class ${nodeClassName} implements INodeType {
	description: INodeTypeDescription = {
		displayName: '${escapeTS(toDisplayName(CUSTOM_NAME))}',
		name: '${nodeInternalName}',
		icon: { light: 'file:./${actualIconLight}', dark: 'file:./${actualIconDark}' },
		group: ['input'],
		version: 1,
		subtitle: '={{\\$parameter["operation"] + ": " + \\$parameter["resource"]}}',
		description: '${escapeTS(defaultDesc)}',
		defaults: { name: '${escapeTS(toDisplayName(CUSTOM_NAME))}' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: '${credName}',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{\\$credentials.url}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
${propertiesContent}
		],
	};
}
`,
);

// ─── Xxx.node.json (codex) ──────────────────────────────────────────────────────

const repoUrl = `https://github.com/${GITHUB_ORG}/${nodeName}`;

writeFileSync(
	join(nodeDir, `${nodeClassName}.node.json`),
	toJSON({
		node: nodeInternalName,
		nodeVersion: '1.0',
		codexVersion: '1.0',
		categories: [CUSTOM_CATEGORY],
		resources: {
			primaryDocumentation: [{ url: repoUrl }],
			credentialDocumentation: [
				{ url: `${repoUrl}?tab=readme-ov-file#credentials` },
			],
		},
	}),
);

// ─── Icons: download or generate placeholder SVGs ────────────────────────────────

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none">
  <rect width="60" height="60" rx="8" fill="#FF6D5A"/>
  <text x="30" y="36" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="24" font-weight="bold">${className.charAt(0)}</text>
</svg>`;

const PLACEHOLDER_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none">
  <rect width="60" height="60" rx="8" fill="#2D2D2D"/>
  <text x="30" y="36" text-anchor="middle" fill="#FF6D5A" font-family="Arial,sans-serif" font-size="24" font-weight="bold">${className.charAt(0)}</text>
</svg>`;

if (LOGO_URL) {
	try {
		console.log(`🎨 Downloading logo from ${LOGO_URL}...`);
		const logoResp = await fetch(LOGO_URL);
		if (logoResp.ok) {
			const buf = Buffer.from(await logoResp.arrayBuffer());
			const contentType = logoResp.headers.get('content-type') || '';
			const ext = extname(new URL(LOGO_URL).pathname).toLowerCase();

			const isSvg = contentType.includes('svg') || ext === '.svg';
			const isPng = contentType.includes('png') || ext === '.png';
			const isJpg = contentType.includes('jpeg') || ext === '.jpg' || ext === '.jpeg';

			if (isSvg) {
				writeFileSync(join(nodeDir, iconLight), buf);
				writeFileSync(join(nodeDir, iconDark), buf);
				console.log('✅ Logo SVG saved (light + dark variants)');
			} else if (isPng || isJpg) {
				const realExt = isPng ? '.png' : '.jpg';
				actualIconLight = iconLight.replace('.svg', realExt);
				actualIconDark = iconDark.replace('.svg', realExt);
				writeFileSync(join(nodeDir, actualIconLight), buf);
				writeFileSync(join(nodeDir, actualIconDark), buf);
				console.log(`✅ Logo ${realExt} saved (light + dark variants)`);
			} else {
				console.log(`⚠️  Format tidak dikenali (${contentType}), using placeholder`);
				writeFileSync(join(nodeDir, iconLight), PLACEHOLDER_SVG);
				writeFileSync(join(nodeDir, iconDark), PLACEHOLDER_DARK_SVG);
			}
		} else {
			console.log('⚠️  Could not download logo (HTTP error), using placeholder');
			writeFileSync(join(nodeDir, iconLight), PLACEHOLDER_SVG);
			writeFileSync(join(nodeDir, iconDark), PLACEHOLDER_DARK_SVG);
		}
	} catch {
		console.log('⚠️  Could not download logo, using placeholder');
		writeFileSync(join(nodeDir, iconLight), PLACEHOLDER_SVG);
		writeFileSync(join(nodeDir, iconDark), PLACEHOLDER_DARK_SVG);
	}
} else {
	writeFileSync(join(nodeDir, iconLight), PLACEHOLDER_SVG);
	writeFileSync(join(nodeDir, iconDark), PLACEHOLDER_DARK_SVG);
	console.log('🎨 Generated placeholder icons (light + dark)');
}

// ─── icons/ directory (global, for credential icon fallback) ─────────────────────

mkdirSync(join(projectDir, 'icons'), { recursive: true });
cpSync(join(nodeDir, actualIconLight), join(projectDir, 'icons', actualIconLight));
cpSync(join(nodeDir, actualIconDark), join(projectDir, 'icons', actualIconDark));

// ─── Copy openapi.json into project ─────────────────────────────────────────────

cpSync('openapi.json', join(projectDir, 'openapi.json'));

// ─── Apply custom templates if provided ──────────────────────────────────────────

if (TEMPLATE_DIR && existsSync(TEMPLATE_DIR)) {
	console.log(`📂 Applying custom templates from ${TEMPLATE_DIR}...`);
	copyDirSync(TEMPLATE_DIR, projectDir);
	console.log('✅ Custom templates applied');
}

// ─── Generate banner SVG ─────────────────────────────────────────────────────────

{
	let logoBuf = null;
	let logoExt = '.png';
	if (LOGO_URL) {
		try {
			const logoResp = await fetch(LOGO_URL);
			if (logoResp.ok) {
				logoBuf = Buffer.from(await logoResp.arrayBuffer());
				const ext = extname(new URL(LOGO_URL).pathname).toLowerCase();
				if (ext) logoExt = ext;
			}
		} catch { /* ignore */ }
	}
	await generateBanner(CUSTOM_NAME, defaultDesc, logoBuf, logoExt, join(projectDir, 'banner.svg'));
}

// ─── README.md ───────────────────────────────────────────────────────────────────

const fundingBadge = `[![Keep It Moving.](https://crypto-donate.insidexofficial.workers.dev/eyJ0aXRsZSI6IktlZXAgSXQgTW92aW5nIiwiZGVzYyI6Ik9uZSBkZXZlbG9wZXIgYnVpbHQgYSB0b29sIHRoYXQgYXV0by1nZW5lcmF0ZXNcbm44biBub2RlcyBmcm9tIGFueSBPcGVuQVBJIHNwZWMuXG5cbllvdXIgZG9uYXRpb24gZnVuZHMgbmV3IGZlYXR1cmVzLCBtb3JlIEFQSSBzdXBwb3J0LFxuYW5kIGJldHRlciB0b29saW5nIGZvciBldmVyeSBkZXZlbG9wZXIgYWZ0ZXIgeW91LiIsInRhcmdldCI6NTAwMCwiYWRkcmVzc2VzIjp7ImV0aGVyZXVtIjoiMHhmMDU1NWQ0MGRiRkI0ZTNCZjA3MDQ0MjgyQjc4RjJmRTFmNTFFZjcyIiwic29sYW5hIjoiNlpEVk5BYmpZZExEcXo4cGt3VUNHYllaNVV3QlFranB0QzU1Wk5vTFcybVUifSwiZGlzY29yZCI6Imh0dHBzOi8vZGlzY29yZC5nZy9wdERaOGU0aDkzIn0/badge)](https://n8n-code.github.io/membership/#/eyJ0aXRsZSI6IktlZXAgSXQgTW92aW5nIiwiZGVzYyI6Ik9uZSBkZXZlbG9wZXIgYnVpbHQgYSB0b29sIHRoYXQgYXV0by1nZW5lcmF0ZXNcbm44biBub2RlcyBmcm9tIGFueSBPcGVuQVBJIHNwZWMuXG5cbllvdXIgZG9uYXRpb24gZnVuZHMgbmV3IGZlYXR1cmVzLCBtb3JlIEFQSSBzdXBwb3J0LFxuYW5kIGJldHRlciB0b29saW5nIGZvciBldmVyeSBkZXZlbG9wZXIgYWZ0ZXIgeW91LiIsInRhcmdldCI6NTAwMCwiYWRkcmVzc2VzIjp7ImV0aGVyZXVtIjoiMHhmMDU1NWQ0MGRiRkI0ZTNCZjA3MDQ0MjgyQjc4RjJmRTFmNTFFZjcyIiwic29sYW5hIjoiNlpEVk5BYmpZZExEcXo4cGt3VUNHYllaNVV3QlFranB0QzU1Wk5vTFcybVUifSwiZGlzY29yZCI6Imh0dHBzOi8vZGlzY29yZC5nZy9wdERaOGU0aDkzIn0)`;

// Count operations and resources for the pitch
const totalOperations = resourceNames.length;
const resourceList = resourceNames.slice(0, 5).map(r => `**${r}**`).join(', ');
const moreResources = resourceNames.length > 5 ? `, and ${resourceNames.length - 5} more` : '';

// Generate the collapsible resources section for README.md
const resourcesAccordionList = [];
for (const r of resourceNames) {
	const props = propertiesByResource.get(r) || [];
	const ops = props.filter(p => p.name === 'operation' && p.type === 'options');
	if (ops.length > 0) {
		const opList = ops[0].options.map(o => {
			const method = (o.routing?.request?.method || '').replace(/[^0-9a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
			const label  = (o.action || o.name || o.value || '').replace(/[^0-9a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();

			const methodTitle = method ? method.charAt(0).toUpperCase() + method.slice(1).toLowerCase() : '';

			let cleanLabel = label;
			if (method && label.toLowerCase().startsWith(method.toLowerCase())) {
				cleanLabel = label.slice(method.length).trim();
			}
			const combined = methodTitle ? `${methodTitle} ${cleanLabel}` : cleanLabel;

			let result = combined.replace(/\b[vV]\s+(\d+)/g, 'v$1');
			result = result.replace(/\b(Api|Url|Http|Https|Json|Xml|Id|Ui|Db|Sql|Ssh|Ftp|Jwt|OAuth|Cors|Csrf|Dns|Ssl|Tls|Cdn|Aws|Gcp|Sdk|Cli|Crud|Rpc|Rest|Graphql|Webhook|Csv|Pdf|Html|Css)\b/gi, (m) => m.toUpperCase());
			return result.charAt(0).toUpperCase() + result.slice(1);
		});

		resourcesAccordionList.push(`<details>
<summary><b>${r}</b> (${opList.length} operations)</summary>

${opList.map(op => `- ${op}`).join('\n')}

</details>`);
	}
}
const resourcesSection = resourcesAccordionList.join('\n\n');

writeFileSync(
	join(projectDir, 'README.md'),
	`# ${packageName}

![${CUSTOM_NAME} Banner](banner.svg)

[![npm version](https://img.shields.io/npm/v/${packageName}.svg)](https://www.npmjs.com/package/${packageName})
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

**Stop writing ${CUSTOM_NAME} API integrations by hand.**

Every time you connect n8n to ${CUSTOM_NAME}, you waste hours mapping endpoints, defining parameters, and debugging schemas. You copy-paste from docs, fix edge cases, and pray nothing breaks.

**What if connecting n8n to ${CUSTOM_NAME} took 5 minutes, not half a day?**

This node gives you **${totalOperations}+ resources** out of the box: ${resourceList}${moreResources}: with full CRUD operations, typed parameters, and zero manual configuration.

---

## What You Get

- **Zero boilerplate**: Resources, operations, and fields are pre-configured and ready to use
- **Full CRUD**: Create, read, update, and delete support where the API allows it
- **Typed parameters**: No more guessing field types
- **Built-in auth**: API key authentication, ready to go
- **Declarative**: Native n8n performance, no custom execute() overhead

---

## Install

\`\`\`bash
npm install ${packageName}
\`\`\`

**Or in n8n:**
1. **Settings → Community Nodes → Install**
2. Search: \`${packageName}\`
3. Click **Install**

---

## Quick Start

1. Install the node (above)
2. Add credentials: **${CUSTOM_NAME} API** → paste your API key
3. Drag the **${CUSTOM_NAME}** node into your workflow
4. Pick a resource → pick an operation → done.

That's it. No configuration files. No code. It just works.

---

## Resources

${resourcesSection}

---

## Why This Node?

**Without this node:**
- Hours of manual API integration
- Copy-pasting from ${CUSTOM_NAME} docs
- Debugging auth, pagination, error handling
- Maintaining your own client code

**With this node:**
- Install → configure → use. 5 minutes.
- Auto-generated from the official ${CUSTOM_NAME} OpenAPI spec
- Always up to date when the API changes
- Native n8n performance

---

## Auto-Generated
This node was auto-generated from the official **${CUSTOM_NAME}** OpenAPI specification using
[@n8n-dev/n8n-openapi-node-ultimate](https://github.com/kelvinzer0/n8n-openapi-node-ultimate),
then validated against the live API so you get accurate types and real parameters, not guesswork.

When the ${CUSTOM_NAME} API updates, this node updates too.

---

## Support This Project

If this node saved you hours of work, consider supporting continued development, new APIs, better error handling, and faster updates.

${fundingBadge}

---

## License

MIT © [${REPO_OWNER}](https://github.com/${GITHUB_ORG})
`,
);

// ─── .npmignore ──────────────────────────────────────────────────────────────────

writeFileSync(
	join(projectDir, '.npmignore'),
	'node_modules/\ntsconfig.json\n.gitignore\nopenapi.json\n',
);

// ─── Summary ─────────────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Project "${nodeName}" created successfully!`);
console.log(`${'='.repeat(60)}`);
console.log(`   Package:     ${packageName}`);
console.log(`   Version:     ${VERSION}`);
console.log(`   Properties:  ${properties.length}`);
console.log(`   Resources:   ${resourceNames.length}`);
console.log(`   Class:       ${nodeClassName}`);
console.log(`   Credential:  ${credentialClassName}`);
console.log(`   Style:       declarative (no execute())`);
console.log(`   Directory:   ${projectDir}/`);
console.log('');
console.log('   Structure:');
console.log(`   ${projectDir}/`);
console.log(`   ├── package.json`);
console.log(`   ├── tsconfig.json`);
console.log(`   ├── .prettierrc.js`);
console.log(`   ├── eslint.config.mjs`);
console.log(`   ├── .gitignore`);
console.log(`   ├── .npmignore`);
console.log(`   ├── README.md`);
console.log(`   ├── banner.svg`);
console.log(`   ├── openapi.json`);
console.log(`   ├── .vscode/`);
console.log(`   │   ├── extensions.json`);
console.log(`   │   └── launch.json`);
console.log(`   ├── icons/`);
console.log(`   │   ├── ${actualIconLight}`);
console.log(`   │   └── ${actualIconDark}`);
console.log(`   ├── credentials/`);
console.log(`   │   └── ${credentialClassName}.credentials.ts`);
console.log(`   └── nodes/`);
console.log(`       └── ${nodeClassName}/`);
console.log(`           ├── ${nodeClassName}.node.ts`);
console.log(`           ├── ${nodeClassName}.node.json`);
console.log(`           ├── ${actualIconLight}`);
console.log(`           ├── ${actualIconDark}`);
console.log(`           └── resources/`);
console.log(`               ├── index.ts`);
for (const [resourceName] of propertiesByResource) {
	const dirName = toDirName(resourceName);
	console.log(`               ├── ${dirName}/`);
	console.log(`               │   └── index.ts`);
}
console.log('');
console.log('   Next steps:');
console.log(`   cd ${projectDir}`);
console.log('   npm install');
console.log('   npm run build');
console.log('');
