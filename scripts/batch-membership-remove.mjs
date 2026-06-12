#!/usr/bin/env node
/**
 * remove-membership-donations.mjs: Remove donation links from n8n-code.github.io membership page
 *
 * The membership page at https://n8n-code.github.io/membership/ is built from
 * the crypto-donate SPA. Donation config is encoded in URL hash fragments.
 *
 * This script:
 *   1. Clones the n8n-code.github.io repo
 *   2. Finds the membership page source files
 *   3. Removes or neutralizes donation-related content
 *   4. Commits and pushes
 *
 * Usage:
 *   node scripts/remove-membership-donations.mjs [--dry-run] [--org n8n-code]
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

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Remove Membership Page Donations`);
console.log(`  Org: ${ORG} | Dry run: ${DRY_RUN}`);
console.log(`${'═'.repeat(60)}\n`);

const WORK_DIR = '/tmp/n8n-membership-work';
if (existsSync(WORK_DIR)) {
	rmSync(WORK_DIR, { recursive: true });
}
mkdirSync(WORK_DIR, { recursive: true });

if (DRY_RUN) {
	console.log(`[DRY RUN] Would clone ${ORG}/${ORG}.github.io, remove donation config, commit and push`);
	console.log(`\nWhat would be removed:`);
	console.log(`  - Base64-encoded donation addresses (ETH, SOL) from URL hashes`);
	console.log(`  - Discord donation link from URL hashes`);
	console.log(`  - "Support This Project" links referencing membership page`);
	console.log(`  - The membership page would redirect to the main n8n-code docs instead`);
	process.exit(0);
}

try {
	// 1. Clone the n8n-code.github.io repo
	const repoUrl = `https://github.com/${ORG}/${ORG}.github.io.git`;
	const repoDir = join(WORK_DIR, `${ORG}.github.io`);

	console.log(`📥 Cloning ${repoUrl}...`);
	try {
		execSync(`git clone --depth 1 ${repoUrl} ${repoDir}`, {
			timeout: 60000,
			encoding: 'utf-8',
			stdio: 'pipe',
		});
	} catch {
		console.log(`❌ Could not clone ${ORG}.github.io repo`);
		console.log(`   The membership page might be hosted from a different repo or from kelvinzer0/crypto-donate`);
		process.exit(1);
	}

	// 2. Find the membership page files
	const membershipDir = join(repoDir, 'membership');
	if (!existsSync(membershipDir)) {
		console.log(`⚠️  No membership/ directory found in ${ORG}.github.io`);
		console.log(`   Checking for alternative locations...`);

		// Search for crypto-donate related files
		const findResult = execSync(`cd ${repoDir} && rg -l "crypto-donate\\|n8nCodeNotice\\|0xf0555d\\|6ZDVNAbj" || echo "NOT_FOUND"`, {
			encoding: 'utf-8',
		});

		if (findResult.trim() === 'NOT_FOUND') {
			console.log(`   No donation-related files found in the repo.`);
			console.log(`   The membership page may be hosted from kelvinzer0/crypto-donate instead.`);
			console.log(`\n   To remove the membership page donations, you need to:`);
			console.log(`   1. Clone kelvinzer0/crypto-donate`);
			console.log(`   2. Or remove the membership/ directory from GitHub Pages`);
			console.log(`   3. Or delete the crypto-donate repo entirely`);
		} else {
			console.log(`   Found donation-related content in:`);
			console.log(findResult);
		}
		process.exit(0);
	}

	// 3. Replace membership page with a simple redirect
	console.log(`🔧 Replacing membership page with redirect...`);

	// Remove existing files in membership dir
	const files = readdirSync(membershipDir);
	for (const file of files) {
		const filePath = join(membershipDir, file);
		if (statSync(filePath).isDirectory()) {
			rmSync(filePath, { recursive: true });
		} else {
			rmSync(filePath);
		}
	}

	// Create a simple redirect page
	writeFileSync(join(membershipDir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>n8n-code - Community Nodes</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #1a1a2e;
            color: #eee;
        }
        .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
        }
        h1 { color: #ff6d5a; }
        p { line-height: 1.6; margin: 1rem 0; }
        a {
            color: #ff6d5a;
            text-decoration: none;
            border: 1px solid #ff6d5a;
            padding: 0.5rem 1.5rem;
            border-radius: 4px;
            display: inline-block;
            margin-top: 1rem;
            transition: all 0.2s;
        }
        a:hover {
            background: #ff6d5a;
            color: #1a1a2e;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>n8n-code Community Nodes</h1>
        <p>Auto-generated n8n community nodes from OpenAPI specifications.</p>
        <p>All our nodes are free and open source (MIT license). No donations needed.</p>
        <a href="https://${ORG}.github.io">← Back to Documentation</a>
    </div>
</body>
</html>
`);

	// 4. Commit and push
	console.log(`📤 Committing and pushing...`);
	execSync(`cd ${repoDir} && git add -A && git commit -m "remove: replace membership/donation page with redirect" && git push`, {
		timeout: 30000,
		encoding: 'utf-8',
		stdio: 'pipe',
	});
	console.log(`✅ Membership page replaced with redirect!`);

} catch (err) {
	console.log(`❌ FAILED: ${err.message}`);
	process.exit(1);
}
