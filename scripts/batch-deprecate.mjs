#!/usr/bin/env node
/**
 * batch-deprecate.mjs: Mark Amazon, Google, Microsoft nodes as deprecated
 *
 * For each platform matching the deprecated prefixes in platforms.csv:
 *   1. Clone the repo from GitHub (n8n-code org)
 *   2. Patch the .node.ts to add deprecated: true + deprecationNotice
 *   3. Patch the README.md to add deprecation banner
 *   4. Commit and push
 *
 * Usage:
 *   node scripts/batch-deprecate.mjs [--dry-run] [--org n8n-code] [--prefix amazonaws]
 *
 * Options:
 *   --dry-run    Don't clone/commit/push, just print what would be done
 *   --org        GitHub org (default: n8n-code)
 *   --prefix     Only process nodes matching this prefix (default: all deprecated)
 *   --scope      npm scope used in package names (default: n8n-dev)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
function getArg(name) {
        const idx = args.indexOf(name);
        return idx >= 0 && idx + 1 < args.length && !args[idx + 1].startsWith('--') ? args[idx + 1] : undefined;
}
const ORG = getArg('--org') || 'n8n-code';
const SCOPE = getArg('--scope') || 'n8n-dev';
const FILTER_PREFIX = getArg('--prefix') || null;

// ─── Deprecated platforms config ────────────────────────────────────────────────
const DEPRECATED_PREFIXES = [
        {
                prefix: 'amazonaws',
                platform: 'Amazon Web Services (AWS)',
                officialNode: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.aws/',
        },
        {
                prefix: 'google',
                platform: 'Google',
                officialNode: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.google/',
        },
        {
                prefix: 'microsoft',
                platform: 'Microsoft',
                officialNode: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoft/',
        },
];

// ─── Read platforms.csv ────────────────────────────────────────────────────────
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

// ─── Filter deprecated platforms ────────────────────────────────────────────────
const deprecatedPlatforms = platforms.filter(p => {
        const safeName = p.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const match = DEPRECATED_PREFIXES.find(d => safeName.startsWith(d.prefix));
        if (!match) return false;
        if (FILTER_PREFIX && !safeName.startsWith(FILTER_PREFIX)) return false;
        return true;
});

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Batch Deprecate: ${deprecatedPlatforms.length} nodes`);
console.log(`  Org: ${ORG} | Scope: ${SCOPE}`);
console.log(`  Dry run: ${DRY_RUN}`);
console.log(`${'═'.repeat(60)}\n`);

const results = { patched: [], skipped: [], failed: [] };

// ─── Work directory ─────────────────────────────────────────────────────────────
const WORK_DIR = '/tmp/n8n-deprecate-work';
if (existsSync(WORK_DIR)) {
        rmSync(WORK_DIR, { recursive: true });
}
mkdirSync(WORK_DIR, { recursive: true });

for (const platform of deprecatedPlatforms) {
        const safeName = platform.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const nodeName = `n8n-nodes-${safeName}`;
        const repoUrl = `https://github.com/${ORG}/${nodeName}.git`;
        const repoDir = join(WORK_DIR, nodeName);
        const depInfo = DEPRECATED_PREFIXES.find(d => safeName.startsWith(d.prefix));

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📦 ${platform.name} → ${nodeName}`);
        console.log(`   Platform: ${depInfo.platform} → ${depInfo.officialNode}`);

        if (DRY_RUN) {
                console.log(`   [DRY RUN] Would clone, patch, commit, push`);
                results.patched.push({ name: platform.name, dir: nodeName });
                continue;
        }

        try {
                // 1. Clone the repo
                console.log(`   📥 Cloning ${repoUrl}...`);
                try {
                        execSync(`git clone --depth 1 ${repoUrl} ${repoDir}`, {
                                timeout: 60000,
                                encoding: 'utf-8',
                                stdio: 'pipe',
                        });
                } catch (cloneErr) {
                        console.log(`   ⏭️  Repo not found or clone failed, skipping`);
                        results.skipped.push({ name: platform.name, error: 'Repo not found' });
                        continue;
                }

                // 2. Find the .node.ts file
                const nodeDir = join(repoDir, 'nodes');
                if (!existsSync(nodeDir)) {
                        console.log(`   ⏭️  No nodes/ directory found, skipping`);
                        results.skipped.push({ name: platform.name, error: 'No nodes/ dir' });
                        continue;
                }

                const nodeClassDirs = readdirSync(nodeDir).filter(d =>
                        statSync(join(nodeDir, d)).isDirectory()
                );
                if (nodeClassDirs.length === 0) {
                        console.log(`   ⏭️  No node class directory found, skipping`);
                        results.skipped.push({ name: platform.name, error: 'No node class dir' });
                        continue;
                }

                const nodeClassDir = nodeClassDirs[0];
                const nodeTsFile = join(nodeDir, nodeClassDir, `${nodeClassDir}.node.ts`);

                if (!existsSync(nodeTsFile)) {
                        console.log(`   ⏭️  No .node.ts file found at ${nodeTsFile}, skipping`);
                        results.skipped.push({ name: platform.name, error: 'No .node.ts' });
                        continue;
                }

                // 3. Patch the .node.ts file
                console.log(`   🔧 Patching ${nodeClassDir}.node.ts...`);
                let nodeTsContent = readFileSync(nodeTsFile, 'utf-8');

                // Check if already deprecated
                if (nodeTsContent.includes('deprecated: true')) {
                        console.log(`   ⏭️  Already deprecated, skipping`);
                        results.skipped.push({ name: platform.name, error: 'Already deprecated' });
                        continue;
                }

                // Add deprecated: true and deprecationNotice after description line
                const deprecationNotice = `This community node is deprecated. Use the official ${depInfo.platform} node built into n8n instead. See: ${depInfo.officialNode}`;

                // Patch 1: Add (Deprecated) to displayName
                nodeTsContent = nodeTsContent.replace(
                        /(displayName:\s*'[^']*')/,
                        `$1 (Deprecated)'`
                );
                // Fix double quote issue - replace trailing quote pattern
                nodeTsContent = nodeTsContent.replace(
                        /(displayName:\s*'[^']*)' \(Deprecated\)'/,
                        `$1 (Deprecated)'`
                );
                // More robust: find displayName and append (Deprecated)
                nodeTsContent = nodeTsContent.replace(
                        /displayName:\s*'([^']+)'([^)]*\n)/,
                        (match, name, rest) => {
                                if (name.includes('Deprecated')) return match;
                                return `displayName: '${name} (Deprecated)'${rest}`;
                        }
                );

                // Patch 2: Add [DEPRECATED] prefix to description
                nodeTsContent = nodeTsContent.replace(
                        /(description:\s*')/,
                        `$1[DEPRECATED] Use the official ${depInfo.platform} node built into n8n. `
                );

                // Patch 3: Add deprecated: true and deprecationNotice after description line
                // Find the line with description: '...' and add deprecation fields after the closing quote+comma
                nodeTsContent = nodeTsContent.replace(
                        /(description:\s*'[^']*'\s*,\n)/,
                        `$1\t\tdeprecated: true,\n\t\tdeprecationNotice: '${deprecationNotice.replace(/'/g, "\\'")}',\n`
                );

                // Patch 4: Set usableAsTool to false for deprecated nodes
                nodeTsContent = nodeTsContent.replace(
                        /usableAsTool:\s*true/,
                        'usableAsTool: false'
                );

                writeFileSync(nodeTsFile, nodeTsContent);
                console.log(`   ✅ Node.ts patched`);

                // 4. Patch the README.md
                const readmeFile = join(repoDir, 'README.md');
                if (existsSync(readmeFile)) {
                        console.log(`   🔧 Patching README.md...`);
                        let readmeContent = readFileSync(readmeFile, 'utf-8');

                        // Check if already has deprecation banner
                        if (!readmeContent.includes('DEPRECATED')) {
                                // Add deprecation banner after the first --- separator
                                const deprecationBanner = `
> **⚠️ DEPRECATED — This node is no longer maintained.**
>
> n8n has **built-in ${depInfo.platform} nodes** that are officially supported, regularly updated, and offer better UX.
>
> **Use the official ${depInfo.platform} node instead:**
> ${depInfo.officialNode}
>
> This community node was auto-generated from the OpenAPI spec and may not follow n8n UX patterns. The official nodes are hand-crafted, tested, and verified by the n8n team.

---

`;
                                // Insert after first ---
                                const firstDash = readmeContent.indexOf('---');
                                if (firstDash !== -1) {
                                        const afterDash = firstDash + 3;
                                        readmeContent = readmeContent.slice(0, afterDash) + '\n' + deprecationBanner + readmeContent.slice(afterDash);
                                } else {
                                        // No --- found, prepend
                                        readmeContent = deprecationBanner + readmeContent;
                                }

                                // Add Deprecated badge after npm version badge
                                readmeContent = readmeContent.replace(
                                        /\[!\[License: MIT\]/,
                                        `[![Deprecated](https://img.shields.io/badge/Status-Deprecated-red.svg)](${depInfo.officialNode})\n[![License: MIT]`
                                );

                                // Add *(Deprecated)* to title
                                readmeContent = readmeContent.replace(
                                        /^(# .+)$/m,
                                        `$1 *(Deprecated)*`
                                );

                                writeFileSync(readmeFile, readmeContent);
                                console.log(`   ✅ README.md patched`);
                        } else {
                                console.log(`   ⏭️  README already has deprecation notice`);
                        }
                }

                // 5. Commit and push
                console.log(`   📤 Committing and pushing...`);
                try {
                        execSync(`cd ${repoDir} && git add -A && git commit -m "deprecated: mark as deprecated, use official ${depInfo.platform} node instead" && git push`, {
                                timeout: 30000,
                                encoding: 'utf-8',
                                stdio: 'pipe',
                        });
                        console.log(`   ✅ Pushed!`);
                        results.patched.push({ name: platform.name, dir: nodeName });
                } catch (pushErr) {
                        console.log(`   ❌ Git push failed: ${pushErr.message?.slice(0, 100)}`);
                        results.failed.push({ name: platform.name, error: `Push failed: ${pushErr.message?.slice(0, 100)}` });
                }

        } catch (err) {
                console.log(`   ❌ FAILED: ${err.message?.slice(0, 200)}`);
                results.failed.push({ name: platform.name, error: err.message?.slice(0, 200) });
        }
}

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n\n${'═'.repeat(60)}`);
console.log(`  BATCH DEPRECATE SUMMARY`);
console.log(`${'═'.repeat(60)}\n`);
console.log(`✅ Patched: ${results.patched.length}`);
for (const s of results.patched) {
        console.log(`   ${s.name} → ${s.dir}`);
}
console.log(`\n⏭️  Skipped: ${results.skipped.length}`);
for (const s of results.skipped) {
        console.log(`   ${s.name}: ${s.error}`);
}
console.log(`\n❌ Failed: ${results.failed.length}`);
for (const f of results.failed) {
        console.log(`   ${f.name}: ${f.error}`);
}

// Write results
const resultsPath = join(import.meta.dirname, '..', 'deprecate-results.json');
writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Results saved to deprecate-results.json\n`);
