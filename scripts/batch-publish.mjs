#!/usr/bin/env node
/**
 * batch-publish.mjs: Push all scaffolded nodes to GitHub + trigger CI
 * Usage: node scripts/batch-publish.mjs [--owner kelvinzer0] [--scope n8n-dev] [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
function getArg(name) {
	const idx = args.indexOf(name);
	return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const OWNER = getArg('--owner') || 'kelvinzer0';
const SCOPE = getArg('--scope') || 'n8n-dev';
const BASE = '/root/.openclaw/workspace/n8n-openapi-node-ultimate';

function run(cmd, opts = {}) {
	try {
		return execSync(cmd, { encoding: 'utf-8', timeout: 60000, maxBuffer: 5 * 1024 * 1024, ...opts }).trim();
	} catch (e) {
		return e.stdout?.trim() || e.stderr?.trim() || e.message;
	}
}

// Find all n8n-nodes-* directories
const nodeDirs = readdirSync(BASE)
	.filter(d => d.startsWith('n8n-nodes-') && existsSync(join(BASE, d, 'package.json')))
	.sort();

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Batch Publish: ${nodeDirs.length} nodes`);
console.log(`  Owner: ${OWNER} | Scope: ${SCOPE} | Dry: ${DRY_RUN}`);
console.log(`${'═'.repeat(60)}\n`);

const results = { success: [], failed: [] };

// GitHub Actions CI workflow for n8n community nodes
const CI_WORKFLOW = `name: Build & Publish

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test --if-present

  publish:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;

for (const dir of nodeDirs) {
	const dirPath = join(BASE, dir);
	const pkg = JSON.parse(readFileSync(join(dirPath, 'package.json'), 'utf-8'));
	const repoName = dir;
	const repoUrl = `https://github.com/${OWNER}/${repoName}`;

	console.log(`\n${'─'.repeat(60)}`);
	console.log(`📦 ${pkg.name} → ${repoName}`);
	console.log(`   Version: ${pkg.version} | Resources: ${pkg.n8n?.nodes?.length || '?'}`);

	try {
		// 1. Write CI workflow
		const workflowDir = join(dirPath, '.github', 'workflows');
		if (!existsSync(workflowDir)) {
			execSync(`mkdir -p "${workflowDir}"`, { encoding: 'utf-8' });
		}
		writeFileSync(join(workflowDir, 'publish.yml'), CI_WORKFLOW);

		// 2. Init git repo
		run(`cd "${dirPath}" && git init && git checkout -b main`, { timeout: 10000 });
		run(`cd "${dirPath}" && git config user.name "${OWNER}" && git config user.email "${OWNER}@users.noreply.github.com"`);

		// 3. Create GitHub repo (or check if exists)
		if (!DRY_RUN) {
			const existing = run(`gh repo view "${OWNER}/${repoName}" --json name 2>&1`);
			if (existing.includes('"name"')) {
				console.log(`   ℹ️  Repo already exists: ${repoUrl}`);
			} else {
				const createResult = run(`gh repo create "${OWNER}/${repoName}" --public --description "n8n community node for ${pkg.description || repoName}" 2>&1`);
				if (createResult.includes('https://')) {
					console.log(`   ✅ Created repo: ${createResult}`);
				} else {
					console.log(`   ⚠️  Repo create: ${createResult}`);
				}
			}

			// 4. Set remote
			run(`cd "${dirPath}" && git remote remove origin 2>/dev/null; git remote add origin "https://x-access-token:${process.env.GH_PAT || ''}@github.com/${OWNER}/${repoName}.git"`);
		}

		// 5. Commit + push
		run(`cd "${dirPath}" && git add -A && git commit -m "feat: initial n8n community node from OpenAPI spec

Auto-generated from ${pkg.description || 'OpenAPI spec'} using
@n8n-dev/n8n-openapi-node-ultimate.

- Declarative n8n node (no execute())
- Dynamic security schemes from OpenAPI spec
- Base URL overridable in credentials
- Full CRUD operations where API supports it"`, { timeout: 15000 });

		if (!DRY_RUN) {
			const pushResult = run(`cd "${dirPath}" && git push -u origin main --force 2>&1`, { timeout: 30000 });
			if (pushResult.includes('-> main') || pushResult.includes('up to date')) {
				console.log(`   ✅ Pushed to ${repoUrl}`);
			} else {
				console.log(`   ⚠️  Push result: ${pushResult}`);
			}

			// 6. Set NPM_TOKEN secret if available
			const npmToken = process.env.NPM_TOKEN;
			if (npmToken) {
				const secretResult = run(`gh secret set NPM_TOKEN --repo "${OWNER}/${repoName}" --body "${npmToken}" 2>&1`);
				if (secretResult.includes('Set') || secretResult.includes('Updated')) {
					console.log(`   🔑 NPM_TOKEN secret set`);
				}
			} else {
				console.log(`   ℹ️  No NPM_TOKEN env — set it manually in repo secrets`);
			}

			// 7. Trigger CI workflow
			const triggerResult = run(`gh workflow run publish.yml --repo "${OWNER}/${repoName}" --ref main 2>&1`);
			if (triggerResult === '' || triggerResult.includes('created')) {
				console.log(`   🚀 CI triggered`);
			} else {
				console.log(`   ℹ️  CI trigger: ${triggerResult}`);
			}
		} else {
			console.log(`   [DRY] Would push to ${repoUrl}`);
			console.log(`   [DRY] Would set NPM_TOKEN secret`);
			console.log(`   [DRY] Would trigger CI`);
		}

		results.success.push({ name: pkg.name, repo: repoUrl });
	} catch (err) {
		console.log(`   ❌ FAILED: ${err.message}`);
		results.failed.push({ name: pkg.name, error: err.message });
	}
}

// Summary
console.log(`\n\n${'═'.repeat(60)}`);
console.log(`  BATCH PUBLISH SUMMARY`);
console.log(`${'═'.repeat(60)}\n`);
console.log(`✅ Success: ${results.success.length}`);
for (const s of results.success) {
	console.log(`   ${s.name} → ${s.repo}`);
}
console.log(`\n❌ Failed: ${results.failed.length}`);
for (const f of results.failed) {
	console.log(`   ${f.name}: ${f.error}`);
}

writeFileSync(join(BASE, 'publish-results.json'), JSON.stringify(results, null, 2));
console.log(`\n📄 Results saved to publish-results.json\n`);
