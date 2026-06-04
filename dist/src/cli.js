#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const N8NPropertiesBuilder_1 = require("./N8NPropertiesBuilder");
const OpenApiLoader_1 = require("./OpenApiLoader");
const program = new commander_1.Command();
program
    .name('n8n-openapi-gen')
    .description('Generate n8n node properties from an OpenAPI spec')
    .version('1.0.0')
    .requiredOption('-i, --input <source>', 'OpenAPI spec source (URL or local file path)')
    .option('-o, --output <file>', 'Output file path (defaults to stdout)')
    .option('--pretty', 'Pretty-print JSON output', true)
    .action(async (opts) => {
    try {
        const doc = await (0, OpenApiLoader_1.loadOpenApi)(opts.input);
        const builder = new N8NPropertiesBuilder_1.N8NPropertiesBuilder(doc);
        const properties = builder.build();
        const json = opts.pretty
            ? JSON.stringify(properties, null, 2)
            : JSON.stringify(properties);
        if (opts.output) {
            const resolved = path.resolve(opts.output);
            fs.mkdirSync(path.dirname(resolved), { recursive: true });
            fs.writeFileSync(resolved, json, 'utf-8');
            console.log(`✅ Written to ${resolved}`);
        }
        else {
            process.stdout.write(json + '\n');
        }
    }
    catch (err) {
        console.error(`❌ Error: ${err.message}`);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map