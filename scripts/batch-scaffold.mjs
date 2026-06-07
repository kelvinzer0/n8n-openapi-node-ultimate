#!/usr/bin/env node
/**
 * batch-scaffold.mjs: Scaffold all platforms from platforms.csv
 * Usage: node scripts/batch-scaffold.mjs [--owner kelvinzer0] [--scope n8n-dev]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const args = process.argv.slice(2);
function getArg(name) {
	const idx = args.indexOf(name);
	return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const OWNER = getArg('--owner') || process.env.REPO_OWNER || 'kelvinzer0';
const SCOPE = getArg('--scope') || process.env.NPM_SCOPE || 'n8n-dev';
const CATEGORY_MAP = {
	'Development': 'Development',
	'Communication': 'Communication',
	'Infrastructure': 'Infrastructure',
	'DeFi': 'Finance',
	'Exchange': 'Finance',
	'Analytics': 'Analytics',
};

// Read platforms.csv
const csvPath = join(import.meta.dirname, '..', 'platforms.csv');
const lines = readFileSync(csvPath, 'utf-8').trim().split('\n');
const header = lines[0].split(',');
const platforms = lines.slice(1).map(line => {
	const cols = [];
	let current = '';
	let inQuotes = false;
	for (const ch of line) {
		if (ch === '"') { inQuotes = !inQuotes; continue; }
		if (ch === ',' && !inQuotes) { cols.push(current); current = ''; continue; }
		current += ch;
	}
	cols.push(current);
	return {
		name: cols[0],
		openapi_url: cols[1],
		logo_url: cols[2] || '',
		description: cols[3] || '',
		category: cols[4] || 'Development',
		publish_npm: cols[5] || 'true',
	};
});

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Batch Scaffold: ${platforms.length} platforms`);
console.log(`  Owner: ${OWNER} | Scope: ${SCOPE}`);
console.log(`${'═'.repeat(60)}\n`);

const results = { success: [], failed: [] };

for (const platform of platforms) {
	const safeName = platform.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
	const nodeDir = `n8n-nodes-${safeName}`;
	const category = CATEGORY_MAP[platform.category] || platform.category;

	console.log(`\n${'─'.repeat(60)}`);
	console.log(`📦 ${platform.name} → ${nodeDir}`);
	console.log(`   URL: ${platform.openapi_url}`);
	console.log(`   Category: ${category}`);

	// Skip if already scaffolded (unless --force)
	if (args.includes('--force') === false && existsSync(nodeDir)) {
		console.log(`   ⏭️  Already exists, skipping (use --force to re-scaffold)`);
		results.success.push({ name: platform.name, dir: nodeDir, skipped: true });
		continue;
	}

	try {
		// Validate OpenAPI URL is reachable first
		console.log(`   📥 Fetching spec...`);
		const resp = await fetch(platform.openapi_url, { signal: AbortSignal.timeout(30000) });
		if (!resp.ok) {
			throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
		}
		const specText = await resp.text();
		let spec;
		try {
			spec = JSON.parse(specText);
		} catch {
			// Try YAML
			const yaml = await import('js-yaml');
			spec = yaml.default.load(specText);
		}

		// Validate it's a valid OpenAPI spec
		if (!spec.openapi && !spec.swagger) {
			throw new Error('Not a valid OpenAPI/Swagger spec (missing openapi/swagger field)');
		}

		// Save spec temporarily
		writeFileSync('/tmp/batch-openapi.json', JSON.stringify(spec, null, 2));

		const env = [
			`OPENAPI_URL=file:///tmp/batch-openapi.json`,
			`CUSTOM_NAME="${platform.name}"`,
			`DESCRIPTION="${platform.description}"`,
			`REPO_OWNER="${OWNER}"`,
			`NPM_SCOPE="${SCOPE}"`,
			`CUSTOM_CATEGORY="${category}"`,
			`VERSION="1.0.0"`,
		];
		if (platform.logo_url) {
			env.push(`LOGO_URL="${platform.logo_url}"`);
		}

		const cmd = `cd /root/.openclaw/workspace/n8n-openapi-node-ultimate && ${env.join(' ')} node scripts/scaffold-node.mjs 2>&1`;
		const output = execSync(cmd, {
			timeout: 120000,
			maxBuffer: 10 * 1024 * 1024,
			encoding: 'utf-8',
		});

		// Check if output contains success
		if (output.includes('created successfully')) {
			console.log(`   ✅ Scaffolded!`);
			results.success.push({ name: platform.name, dir: nodeDir });
		} else {
			console.log(`   ⚠️  Completed but may have issues`);
			console.log(output.split('\n').slice(-5).join('\n'));
			results.success.push({ name: platform.name, dir: nodeDir, warning: true });
		}
	} catch (err) {
		console.log(`   ❌ FAILED: ${err.message}`);
		results.failed.push({ name: platform.name, url: platform.openapi_url, error: err.message });
	}
}

// Summary
console.log(`\n\n${'═'.repeat(60)}`);
console.log(`  BATCH SCAFFOLD SUMMARY`);
console.log(`${'═'.repeat(60)}\n`);
console.log(`✅ Success: ${results.success.length}`);
for (const s of results.success) {
	const skip = s.skipped ? ' (skipped)' : '';
	const warn = s.warning ? ' ⚠️' : '';
	console.log(`   ${s.name} → ${s.dir}${skip}${warn}`);
}
console.log(`\n❌ Failed: ${results.failed.length}`);
for (const f of results.failed) {
	console.log(`   ${f.name}: ${f.error}`);
}

// Write results to file
writeFileSync('scaffold-results.json', JSON.stringify(results, null, 2));
console.log(`\n📄 Results saved to scaffold-results.json\n`);
