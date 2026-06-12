#!/usr/bin/env node
/**
 * batch-remove-donations.mjs: Remove all donation links from n8n-code node repos
 *
 * Removes:
 *   1. "n8nCodeNotice" field from credential .credentials.ts files
 *   2. "Support This Project" section from README.md files
 *
 * Usage:
 *   node scripts/batch-remove-donations.mjs [--dry-run] [--org n8n-code] [--prefix amazonaws]
 *
 * Options:
 *   --dry-run    Don't clone/commit/push, just print what would be done
 *   --org        GitHub org (default: n8n-code)
 *   --prefix     Only process nodes matching this name prefix (default: all)
 *   --scope      npm scope used in package names (default: n8n-dev)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
function getArg(name) {
	const idx = args.indexOf(name);
	return idx >= 0 && idx + 1 < args.length && !args[idx + 1].startsWith('--') ? args[idx + 1] : undefined;
}
const ORG = getArg('--org') || 'n8n-code';
const SCOPE = getArg('--scope') || 'n8n-dev';
const FILTER_PREFIX = getArg('--prefix') || null;

// ─── Read platforms.csv ────────────────────────────────────────────────────────
const csvPath = join(import.meta.dirname, '..', 'platforms.csv');
const lines = readFileSync(csvPath, 'utf-8').trim().split('\n');
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
	return { name: cols[0] };
});

// Filter by prefix if specified
const filteredPlatforms = FILTER_PREFIX
	? platforms.filter(p => {
		const safeName = p.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
		return safeName.startsWith(FILTER_PREFIX);
	})
	: platforms;

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Batch Remove Donations: ${filteredPlatforms.length} nodes`);
console.log(`  Org: ${ORG} | Scope: ${SCOPE}`);
console.log(`  Dry run: ${DRY_RUN}`);
console.log(`${'═'.repeat(60)}\n`);

const results = { patched: [], skipped: [], failed: [] };

// ─── Work directory ─────────────────────────────────────────────────────────────
const WORK_DIR = '/tmp/n8n-remove-donations-work';
if (existsSync(WORK_DIR)) {
	rmSync(WORK_DIR, { recursive: true });
}
mkdirSync(WORK_DIR, { recursive: true });

let processedCount = 0;

for (const platform of filteredPlatforms) {
	const safeName = platform.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
	const nodeName = `n8n-nodes-${safeName}`;
	const repoUrl = `https://github.com/${ORG}/${nodeName}.git`;
	const repoDir = join(WORK_DIR, nodeName);

	processedCount++;
	if (processedCount % 50 === 0) {
		console.log(`\n  📊 Progress: ${processedCount}/${filteredPlatforms.length}\n`);
	}

	if (DRY_RUN) {
		console.log(`📦 ${nodeName} → [DRY RUN] Would remove donation links`);
		results.patched.push({ name: platform.name, dir: nodeName });
		continue;
	}

	try {
		// 1. Clone the repo (shallow)
		try {
			execSync(`git clone --depth 1 ${repoUrl} ${repoDir} 2>/dev/null`, {
				timeout: 30000,
				encoding: 'utf-8',
				stdio: 'pipe',
			});
		} catch {
			results.skipped.push({ name: platform.name, error: 'Repo not found' });
			continue;
		}

		let modified = false;

		// 2. Patch credential files - remove n8nCodeNotice field
		const credDir = join(repoDir, 'credentials');
		if (existsSync(credDir)) {
			const credFiles = readdirSync(credDir).filter(f => f.endsWith('.credentials.ts'));
			for (const credFile of credFiles) {
				const credPath = join(credDir, credFile);
				let content = readFileSync(credPath, 'utf-8');

				if (content.includes('n8nCodeNotice') || content.includes('crypto-donate') || content.includes('Buy me a coffee')) {
					console.log(`🔧 ${nodeName}: Removing donation notice from ${credFile}`);

					// Remove the n8nCodeNotice field block from credentials
					// Pattern: the entire object block from { displayName: "❤️..." to the closing },
					// This handles both single-quoted and double-quoted variants
					content = content.replace(
						/,\s*\{\s*(?:"|')displayName(?:"|'):\s*(?:"|')[^"']*n8nCodeNotice[^}]*\}/gs,
						''
					);

					// Alternative pattern for the notice field
					content = content.replace(
						/,\s*\{\s*"displayName":\s*"[^"]*Keep It Moving[^}]*"name":\s*"n8nCodeNotice"[^}]*\}/gs,
						''
					);

					// More aggressive: remove any field with n8nCodeNotice as name
					content = content.replace(
						/\{[^{}]*"name"\s*:\s*"n8nCodeNotice"[^{}]*\}/g,
						''
					);

					// Remove trailing commas before closing brackets
					content = content.replace(/,(\s*\])/, '$1');
					content = content.replace(/,(\s*\})/, '$1');

					writeFileSync(credPath, content);
					modified = true;
				}
			}
		}

		// 3. Patch README.md - remove "Support This Project" section
		const readmePath = join(repoDir, 'README.md');
		if (existsSync(readmePath)) {
			let readmeContent = readFileSync(readmePath, 'utf-8');

			if (readmeContent.includes('Support This Project') || readmeContent.includes('crypto-donate') || readmeContent.includes('n8n-code.github.io/membership')) {
				console.log(`🔧 ${nodeName}: Removing donation section from README.md`);

				// Remove "## Support This Project" section (everything from ## Support to the next ## or end)
				readmeContent = readmeContent.replace(
					/##\s*Support This Project[\s\S]*?(?=\n##\s|\n---\s*\n##\s|\n##\s|<!-- end -->|$)/i,
					''
				);

				// Remove any remaining crypto-donate badges/links
				readmeContent = readmeContent.replace(
					/\[!\[Donation[^\]]*\]\([^)]*\)\]\([^)]*\)/g,
					''
				);

				// Remove membership page links
				readmeContent = readmeContent.replace(
					/https:\/\/n8n-code\.github\.io\/membership[^)\s]*/g,
					''
				);

				// Clean up multiple blank lines
				readmeContent = readmeContent.replace(/\n{3,}/g, '\n\n');

				writeFileSync(readmePath, readmeContent);
				modified = true;
			}
		}

		if (!modified) {
			results.skipped.push({ name: platform.name, error: 'No donation content found' });
			continue;
		}

		// 4. Commit and push
		try {
			execSync(`cd ${repoDir} && git add -A && git commit -m "remove: delete donation links from credentials and README" && git push`, {
				timeout: 30000,
				encoding: 'utf-8',
				stdio: 'pipe',
			});
			console.log(`✅ ${nodeName}: Pushed!`);
			results.patched.push({ name: platform.name, dir: nodeName });
		} catch (pushErr) {
			console.log(`❌ ${nodeName}: Push failed`);
			results.failed.push({ name: platform.name, error: 'Push failed' });
		}

	} catch (err) {
		console.log(`❌ ${nodeName}: FAILED - ${err.message?.slice(0, 100)}`);
		results.failed.push({ name: platform.name, error: err.message?.slice(0, 100) });
	}
}

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n\n${'═'.repeat(60)}`);
console.log(`  BATCH REMOVE DONATIONS SUMMARY`);
console.log(`${'═'.repeat(60)}\n`);
console.log(`✅ Patched: ${results.patched.length}`);
console.log(`⏭️  Skipped: ${results.skipped.length}`);
console.log(`❌ Failed: ${results.failed.length}`);

if (results.failed.length > 0) {
	console.log(`\nFailed repos:`);
	for (const f of results.failed) {
		console.log(`   ${f.name}: ${f.error}`);
	}
}

const resultsPath = join(import.meta.dirname, '..', 'remove-donations-results.json');
writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Results saved to remove-donations-results.json\n`);
