#!/usr/bin/env node
/**
 * scaffold-node.mjs — Generate n8n community node project from OpenAPI spec
 *
 * Generates a project matching the n8n-nodes-starter standard exactly:
 *   nodes/Xxx/Xxx.node.ts
 *   nodes/Xxx/Xxx.node.json        (codex)
 *   nodes/Xxx/xxx.svg / xxx.dark.svg (icons)
 *   credentials/XxxApi.credentials.ts
 *   .prettierrc.js, eslint.config.mjs, .vscode/, tsconfig.json, package.json
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
 *
 * CLI args:
 *   --template-dir <path>  Custom template directory (overrides TEMPLATE_DIR env)
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
import { execSync } from 'child_process';
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
	return str
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.split(' ')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join('');
}

function toJSON(obj, indent = 2) {
	return JSON.stringify(obj, null, indent) + '\n';
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
const defaultDesc = DESCRIPTION || `n8n community node for ${CUSTOM_NAME} API`;
const nodeClassName = className;
const credentialClassName = `${className}Api`;

console.log(`\n${'='.repeat(60)}`);
console.log(`  Scaffolding: ${nodeName}`);
console.log(`${'='.repeat(60)}\n`);

// ─── Fetch OpenAPI spec ──────────────────────────────────────────────────────────

console.log(`📥 Fetching OpenAPI spec from ${OPENAPI_URL}...`);
const resp = await fetch(OPENAPI_URL);
if (!resp.ok) {
	console.error(`❌ Failed to fetch: ${resp.status}`);
	process.exit(1);
}
let specText = await resp.text();
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

// ─── Create project ──────────────────────────────────────────────────────────────

console.log(`📦 Creating project: ${nodeName}...`);
const projectDir = nodeName;
if (!existsSync(projectDir)) mkdirSync(projectDir, { recursive: true });

// Determine icon filenames
const iconSlug = safeName.replace(/^n8n-nodes-/, '');
const iconLight = `${iconSlug}.svg`;
const iconDark = `${iconSlug}.dark.svg`;

// ─── package.json ────────────────────────────────────────────────────────────────

const packageJson = {
	name: packageName,
	version: VERSION,
	description: defaultDesc,
	license: 'MIT',
	homepage: '',
	keywords: ['n8n-community-node-package'],
	author: { name: REPO_OWNER, email: '' },
	repository: {
		type: 'git',
		url: `https://github.com/${REPO_OWNER}/${nodeName}.git`,
	},
	scripts: {
		build: 'n8n-node build',
		'build:watch': 'tsc --watch',
		dev: 'n8n-node dev',
		lint: 'n8n-node lint',
		'lint:fix': 'n8n-node lint --fix',
		release: 'n8n-node release',
		prepublishOnly: 'n8n-node prerelease',
	},
	files: ['dist'],
	n8n: {
		n8nNodesApiVersion: 1,
		strict: true,
		credentials: [`dist/credentials/${credentialClassName}.credentials.js`],
		nodes: [`dist/nodes/${nodeClassName}/${nodeClassName}.node.js`],
	},
	devDependencies: {
		'@n8n/node-cli': '*',
		eslint: '9.39.4',
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

// Determine credential icon path (relative to credentials/ folder → ../icons/ or ../nodes/Xxx/)
const credIconPath = LOGO_URL
	? `../nodes/${nodeClassName}/${iconLight}`
	: `../nodes/${nodeClassName}/${iconLight}`;

writeFileSync(
	join(projectDir, 'credentials', `${credentialClassName}.credentials.ts`),
	`import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ${credentialClassName} implements ICredentialType {
	name = '${nodeName}Api';

	displayName = '${CUSTOM_NAME} API';

	icon: Icon = { light: 'file:../nodes/${nodeClassName}/${iconLight}', dark: 'file:../nodes/${nodeClassName}/${iconDark}' };

	documentationUrl = '';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/',
			method: 'GET',
		},
	};
}
`,
);

// ─── Node directory: nodes/Xxx/ ──────────────────────────────────────────────────

const nodeDir = join(projectDir, 'nodes', nodeClassName);
mkdirSync(nodeDir, { recursive: true });

// ─── Xxx.node.ts ─────────────────────────────────────────────────────────────────

const propertiesJSON = JSON.stringify(properties, null, '\t').replace(/\n/g, '\n\t\t');

writeFileSync(
	join(nodeDir, `${nodeClassName}.node.ts`),
	`import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class ${nodeClassName} implements INodeType {
	description: INodeTypeDescription = {
		displayName: '${CUSTOM_NAME}',
		name: '${nodeName}',
		icon: { light: 'file:./${iconLight}', dark: 'file:./${iconDark}' },
		group: ['transform'],
		version: 1,
		subtitle: '={{\\$parameter["operation"] + ": " + \\$parameter["resource"]}}',
		description: '${defaultDesc.replace(/'/g, "\\'")}',
		defaults: { name: '${CUSTOM_NAME}' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: '${nodeName}Api', required: true }],
		requestDefaults: {
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			baseURL: '={{\\$credentials.url}}',
		},
		properties: ${propertiesJSON},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// The actual HTTP requests are handled by n8n's built-in routing
				// via requestDefaults and the properties configuration above.
				// This execute method provides the framework for item-by-item processing.
				returnData.push(items[i]);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: i });
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}
`,
);

// ─── Xxx.node.json (codex) ──────────────────────────────────────────────────────

const repoUrl = `https://github.com/${REPO_OWNER}/${nodeName}`;

writeFileSync(
	join(nodeDir, `${nodeClassName}.node.json`),
	toJSON({
		node: nodeName,
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
			const ext = extname(new URL(LOGO_URL).pathname).toLowerCase();

			if (ext === '.svg') {
				// Use the same SVG for both light and dark
				writeFileSync(join(nodeDir, iconLight), buf);
				writeFileSync(join(nodeDir, iconDark), buf);
				console.log('✅ Logo saved (light + dark variants)');
			} else {
				// For PNG/JPG, save as-is; n8n expects SVG but will accept others
				writeFileSync(join(nodeDir, iconLight), buf);
				writeFileSync(join(nodeDir, iconDark), buf);
				console.log('✅ Logo saved (non-SVG format)');
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
	// No logo URL: generate placeholder icons
	writeFileSync(join(nodeDir, iconLight), PLACEHOLDER_SVG);
	writeFileSync(join(nodeDir, iconDark), PLACEHOLDER_DARK_SVG);
	console.log('🎨 Generated placeholder icons (light + dark)');
}

// ─── icons/ directory (global, for credential icon fallback) ─────────────────────

mkdirSync(join(projectDir, 'icons'), { recursive: true });
// Copy the same icons to the global icons dir as well
cpSync(join(nodeDir, iconLight), join(projectDir, 'icons', iconLight));
cpSync(join(nodeDir, iconDark), join(projectDir, 'icons', iconDark));

// ─── Copy openapi.json into project ─────────────────────────────────────────────

cpSync('openapi.json', join(projectDir, 'openapi.json'));

// ─── Apply custom templates if provided ──────────────────────────────────────────

if (TEMPLATE_DIR && existsSync(TEMPLATE_DIR)) {
	console.log(`📂 Applying custom templates from ${TEMPLATE_DIR}...`);
	copyDirSync(TEMPLATE_DIR, projectDir);
	console.log('✅ Custom templates applied');
}

// ─── README.md ───────────────────────────────────────────────────────────────────

writeFileSync(
	join(projectDir, 'README.md'),
	`# ${packageName}

> n8n community node for **${CUSTOM_NAME}** API

${defaultDesc}

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Usage

1. In n8n: **Settings → Community Nodes → Install** → \`${packageName}\`
2. Add credentials: **${CUSTOM_NAME} API** → Base URL + API Key
3. Use the node in your workflows

## Auto-generated

This node was auto-generated from an OpenAPI specification using
[@kelvinzer0/n8n-openapi-node-ultimate](https://github.com/kelvinzer0/n8n-openapi-node-ultimate).

## License

MIT
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
console.log(`   Class:       ${nodeClassName}`);
console.log(`   Credential:  ${credentialClassName}`);
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
console.log(`   ├── openapi.json`);
console.log(`   ├── .vscode/`);
console.log(`   │   ├── extensions.json`);
console.log(`   │   └── launch.json`);
console.log(`   ├── icons/`);
console.log(`   │   ├── ${iconLight}`);
console.log(`   │   └── ${iconDark}`);
console.log(`   ├── credentials/`);
console.log(`   │   └── ${credentialClassName}.credentials.ts`);
console.log(`   └── nodes/`);
console.log(`       └── ${nodeClassName}/`);
console.log(`           ├── ${nodeClassName}.node.ts`);
console.log(`           ├── ${nodeClassName}.node.json`);
console.log(`           ├── ${iconLight}`);
console.log(`           └── ${iconDark}`);
console.log('');
console.log('   Next steps:');
console.log(`   cd ${projectDir}`);
console.log('   npm install');
console.log('   npm run build');
console.log('');
