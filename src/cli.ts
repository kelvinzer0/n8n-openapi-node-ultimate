#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { N8NPropertiesBuilder } from './N8NPropertiesBuilder';
import { loadOpenApi } from './OpenApiLoader';

const program = new Command();

program
    .name('n8n-openapi-gen')
    .description('Generate n8n node properties from an OpenAPI spec')
    .version('1.0.0')
    .requiredOption('-i, --input <source>', 'OpenAPI spec source (URL or local file path)')
    .option('-o, --output <file>', 'Output file path (defaults to stdout)')
    .option('--pretty', 'Pretty-print JSON output', true)
    .action(async (opts) => {
        try {
            const doc = await loadOpenApi(opts.input);
            const builder = new N8NPropertiesBuilder(doc);
            const properties = builder.build();
            const json = opts.pretty
                ? JSON.stringify(properties, null, 2)
                : JSON.stringify(properties);

            if (opts.output) {
                const resolved = path.resolve(opts.output);
                fs.mkdirSync(path.dirname(resolved), { recursive: true });
                fs.writeFileSync(resolved, json, 'utf-8');
                console.log(`✅ Written to ${resolved}`);
            } else {
                process.stdout.write(json + '\n');
            }
        } catch (err: any) {
            console.error(`❌ Error: ${err.message}`);
            process.exit(1);
        }
    });

program.parse();
