#!/usr/bin/env node
/**
 * scaffold-node.mjs — Generate n8n community node project from OpenAPI spec
 * 
 * Env vars:
 *   OPENAPI_URL   - URL to OpenAPI spec (JSON or YAML)
 *   CUSTOM_NAME   - Name (e.g. "Evolution" → n8n-nodes-evolution)
 *   LOGO_URL      - Optional logo URL
 *   DESCRIPTION   - Optional description
 *   VERSION       - Version (default 1.0.0)
 *   REPO_OWNER    - GitHub repo owner
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

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

// --- Env ---
const OPENAPI_URL = process.env.OPENAPI_URL;
const CUSTOM_NAME = process.env.CUSTOM_NAME || 'Custom';
const LOGO_URL = process.env.LOGO_URL || '';
const DESCRIPTION = process.env.DESCRIPTION || '';
const VERSION = process.env.VERSION || '1.0.0';
const REPO_OWNER = process.env.REPO_OWNER || 'unknown';
const NPM_SCOPE = process.env.NPM_SCOPE || REPO_OWNER;

if (!OPENAPI_URL) { console.error('❌ OPENAPI_URL is required'); process.exit(1); }
if (!CUSTOM_NAME) { console.error('❌ CUSTOM_NAME is required'); process.exit(1); }

// --- Normalize ---
const safeName = CUSTOM_NAME.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const nodeName = `n8n-nodes-${safeName}`;
const className = CUSTOM_NAME.replace(/[^a-zA-Z0-9]/g, '');
const packageName = `@${NPM_SCOPE}/${nodeName}`;
const defaultDesc = DESCRIPTION || `n8n community node for ${CUSTOM_NAME} API`;

console.log(`\n${'='.repeat(60)}`);
console.log(`  Scaffolding: ${nodeName}`);
console.log(`${'='.repeat(60)}\n`);

// --- Fetch OpenAPI ---
console.log(`📥 Fetching OpenAPI spec from ${OPENAPI_URL}...`);
const resp = await fetch(OPENAPI_URL);
if (!resp.ok) { console.error(`❌ Failed to fetch: ${resp.status}`); process.exit(1); }
let specText = await resp.text();
let spec;
try {
  // Try JSON first
  spec = JSON.parse(specText);
  console.log('📄 Format: JSON');
} catch {
  // Try YAML
  try {
    const yaml = await import('js-yaml');
    spec = yaml.default.load(specText);
    console.log('📄 Format: YAML');
  } catch (e) {
    console.error('❌ Cannot parse spec as JSON or YAML'); process.exit(1);
  }
}
writeFileSync('openapi.json', JSON.stringify(spec, null, 2));
console.log('✅ OpenAPI spec saved\n');

// --- Generate properties ---
console.log('🔧 Generating n8n node properties...');
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const { N8NPropertiesBuilder } = await import(join(__dirname, '..', 'dist', 'src', 'index.js'));
const parser = new N8NPropertiesBuilder(spec);
const properties = parser.build();
writeFileSync('properties.json', JSON.stringify(properties, null, 2));
console.log(`✅ Generated ${properties.length} properties\n`);

// --- Create project ---
console.log(`📦 Creating project: ${nodeName}...`);
const projectDir = nodeName;
if (!existsSync(projectDir)) mkdirSync(projectDir, { recursive: true });

// package.json
writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
  name: packageName,
  version: VERSION,
  description: defaultDesc,
  main: 'dist/index.js',
  types: 'dist/index.d.ts',
  scripts: { build: 'tsc && mkdir -p dist/lib && cp -r lib/. dist/lib/', test: 'echo "no tests yet"' },
  n8n: {
    n8nNodesApiVersion: 1,
    credentials: [`dist/nodes/credentials/${nodeName}Api.credentials.js`],
    nodes: [`dist/nodes/${nodeName}.node.js`]
  },
  keywords: ['n8n-community-node-package', 'n8n', nodeName, safeName],
  author: REPO_OWNER,
  license: 'MIT',
  dependencies: {
    'js-yaml': '^4.1.0',
    'lodash': '^4.17.21',
    'openapi-types': '^12.1.3',
    'pino': '^9.4.0',
    'pino-pretty': '^11.2.2'
  },
  devDependencies: { 'n8n-workflow': '*', typescript: '^5.6.0' }
}, null, 2));

// tsconfig.json
writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    strict: true, module: 'commonjs', target: 'es2020', lib: ['es2020'],
    moduleResolution: 'node', esModuleInterop: true, skipLibCheck: true,
    forceConsistentCasingInFileNames: true, outDir: './dist', rootDir: '.',
    declaration: true, sourceMap: true, resolveJsonModule: true
  },
  include: ['**/*.ts', 'types/**/*.d.ts'],
  exclude: ['node_modules', 'dist']
}, null, 2));

// .gitignore
writeFileSync(join(projectDir, '.gitignore'), 'node_modules/\ndist/\n*.js.map\n');

// .npmignore
writeFileSync(join(projectDir, '.npmignore'), 'node_modules/\ntsconfig.json\n.gitignore\n');

// Inline generator library (pre-compiled JS, no extra deps needed)
console.log('📦 Inlining generator library...');
const libSrc = join(__dirname, '..', 'dist', 'src');
const libDest = join(projectDir, 'lib');
if (existsSync(libSrc)) {
  copyDirSync(libSrc, libDest);
  // Remove test files
  const specJs = join(libDest, 'N8NPropertiesBuilder.spec.js');
  const specDts = join(libDest, 'N8NPropertiesBuilder.spec.d.ts');
  const specMap = join(libDest, 'N8NPropertiesBuilder.spec.js.map');
  const { unlinkSync: rm } = await import('fs');
  for (const f of [specJs, specDts, specMap]) { if (existsSync(f)) rm(f); }
  console.log('✅ Library inlined as lib/');
} else {
  console.error('❌ Generator not built. Run "npm run build" first.');
  process.exit(1);
}

// Credential file
mkdirSync(join(projectDir, 'nodes', 'credentials'), { recursive: true });
writeFileSync(join(projectDir, 'nodes', 'credentials', `${nodeName}Api.credentials.ts`),
`import {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class ${className}Api implements ICredentialType {
  name = '${nodeName}Api';
  displayName = '${CUSTOM_NAME} API';
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
        'Authorization': '=Bearer {{\$credentials.apiKey}}',
      },
    },
  };
}
`);

// Node file
mkdirSync(join(projectDir, 'nodes'), { recursive: true });
const iconRef = LOGO_URL ? `file:${LOGO_URL}` : 'file:node.svg';
writeFileSync(join(projectDir, 'nodes', `${nodeName}.node.ts`),
`import { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { N8NPropertiesBuilder } from '../lib';
import * as doc from '../openapi.json';

const parser = new N8NPropertiesBuilder(doc);
const properties = parser.build();

export class ${className} implements INodeType {
  description: INodeTypeDescription = {
    displayName: '${CUSTOM_NAME}',
    name: '${nodeName}',
    icon: '${iconRef}',
    group: ['transform'],
    version: 1,
    subtitle: '={{\$parameter["operation"] + ": " + \$parameter["resource"]}}',
    description: '${defaultDesc.replace(/'/g, "\\'")}',
    defaults: { name: '${CUSTOM_NAME}' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: '${nodeName}Api', required: true }],
    requestDefaults: {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      baseURL: '={{\$credentials.url}}',
    },
    properties: properties,
  };
}
`);

// Copy openapi.json into project
cpSync('openapi.json', join(projectDir, 'openapi.json'));

// Download logo
if (LOGO_URL) {
  try {
    console.log(`🎨 Downloading logo from ${LOGO_URL}...`);
    const logoResp = await fetch(LOGO_URL);
    if (logoResp.ok) {
      const ext = LOGO_URL.endsWith('.png') ? '.png' : '.svg';
      const buf = Buffer.from(await logoResp.arrayBuffer());
      writeFileSync(join(projectDir, 'nodes', `node${ext}`), buf);
      console.log('✅ Logo saved');
    }
  } catch { console.log('⚠️ Could not download logo'); }
}

// README
writeFileSync(join(projectDir, 'README.md'),
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
`);

console.log(`\n✅ Project "${nodeName}" created successfully!`);
console.log(`   Properties: ${properties.length}`);
console.log(`   Package: ${packageName}`);
console.log(`   Version: ${VERSION}\n`);
