# n8n-openapi-node-ultimate

[![Keep It Moving.](https://crypto-donate.insidexofficial.workers.dev/eyJ0aXRsZSI6IktlZXAgSXQgTW92aW5nIiwiZGVzYyI6Ik9uZSBkZXZlbG9wZXIgYnVpbHQgYSB0b29sIHRoYXQgYXV0by1nZW5lcmF0ZXNcbm44biBub2RlcyBmcm9tIGFueSBPcGVuQVBJIHNwZWMuXG5cbllvdXIgZG9uYXRpb24gZnVuZHMgbmV3IGZlYXR1cmVzLCBtb3JlIEFQSSBzdXBwb3J0LFxuYW5kIGJldHRlciB0b29saW5nIGZvciBldmVyeSBkZXZlbG9wZXIgYWZ0ZXIgeW91LiIsInRhcmdldCI6NTAwMCwiYWRkcmVzc2VzIjp7ImV0aGVyZXVtIjoiMHhmMDU1NWQ0MGRiRkI0ZTNCZjA3MDQ0MjgyQjc4RjJmRTFmNTFFZjcyIiwic29sYW5hIjoiNlpEVk5BYmpZZExEcXo4cGt3VUNHYllaNVV3QlFranB0QzU1Wk5vTFcybVUifSwiZGlzY29yZCI6Imh0dHBzOi8vZGlzY29yZC5nZy9wdERaOGU0aDkzIn0/badge)](https://n8n-code.github.io/membership/#/eyJ0aXRsZSI6IktlZXAgSXQgTW92aW5nIiwiZGVzYyI6Ik9uZSBkZXZlbG9wZXIgYnVpbHQgYSB0b29sIHRoYXQgYXV0by1nZW5lcmF0ZXNcbm44biBub2RlcyBmcm9tIGFueSBPcGVuQVBJIHNwZWMuXG5cbllvdXIgZG9uYXRpb24gZnVuZHMgbmV3IGZlYXR1cmVzLCBtb3JlIEFQSSBzdXBwb3J0LFxuYW5kIGJldHRlciB0b29saW5nIGZvciBldmVyeSBkZXZlbG9wZXIgYWZ0ZXIgeW91LiIsInRhcmdldCI6NTAwMCwiYWRkcmVzc2VzIjp7ImV0aGVyZXVtIjoiMHhmMDU1NWQ0MGRiRkI0ZTNCZjA3MDQ0MjgyQjc4RjJmRTFmNTFFZjcyIiwic29sYW5hIjoiNlpEVk5BYmpZZExEcXo4cGt3VUNHYllaNVV3QlFranB0QzU1Wk5vTFcybVUifSwiZGlzY29yZCI6Imh0dHBzOi8vZGlzY29yZC5nZy9wdERaOGU0aDkzIn0)

[![npm version](https://img.shields.io/npm/v/@kelvinzer0/n8n-openapi-node-ultimate.svg)](https://www.npmjs.com/package/@kelvinzer0/n8n-openapi-node-ultimate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/@kelvinzer0/n8n-openapi-node-ultimate.svg)](https://www.npmjs.com/package/@kelvinzer0/n8n-openapi-node-ultimate)
[![CI](https://github.com/kelvinzer0/n8n-openapi-node-ultimate/actions/workflows/publish.yaml/badge.svg)](https://github.com/kelvinzer0/n8n-openapi-node-ultimate/actions)

---

**Stop writing n8n node properties by hand.**

Every time you build a custom n8n node for an API, you spend hours — sometimes days — manually defining operations, parameters, and schemas. You copy-paste from Swagger docs, fix edge cases, handle nested `$ref`s, and pray nothing breaks in production.

**What if your n8n node properties wrote themselves?**

Point this library at any OpenAPI spec — a URL, a local file, YAML or JSON — and get n8n node properties in seconds.

> ⚠️ **This tool maps operations 1:1 from your OpenAPI spec.** If your spec only defines `GET` and `POST` for a resource, the generated node will only have those operations — no `PUT`, no `DELETE`. It does **not** invent missing operations. Always verify your spec covers the CRUD operations you need before deploying.

---

## The Problem You've Faced

You found an API you want to integrate with n8n. It has an OpenAPI spec: hundreds of endpoints, nested schemas, authentication flows. You look at the n8n node property format and realize:

- There are **hundreds of operations** to define
- **Schema references** (`$ref`) go 5, 6, 7 levels deep
- **allOf composition** merges objects in ways that break naive generators
- Some specs use **OpenAPI 3.1** with union types like `type: ['string', 'null']`
- **Circular references** crash most parsers
- Half the operations don't even have an `operationId`

So you do it by hand. Again. For the 47th API.

**This library ends that cycle.**

---

## What You Get

**🔗 Any Source, Any Format**
URL or file. JSON or YAML. OpenAPI 3.0 or 3.1.

**🖥️ CLI for Instant Generation**
One command. No code needed.
```bash
npx n8n-openapi-gen --input https://api.example.com/openapi.json --output properties.json
```

**🔧 Schema Support**
- `allOf` composition: properly merged, not concatenated
- Union types (`type: ['string', 'null']`): handled natively
- Circular `$ref`s: protected with depth limiting (max 50)
- Path-level `$ref`: resolved correctly

> **Note:** The generated properties are only as complete as the source spec. Missing operations, incomplete schemas, or missing `operationId`s in the spec will result in incomplete output. Review the generated properties before deploying.

**🏷️ Smart Naming**
Operations without `operationId`? Generates clean, human-readable names automatically. No `undefined_operation_37`.

**🎛️ Fully Customizable**
Override parsers, collectors, and behavior. Make it yours.

**📦 Simple Setup**

`npm install` → `import` → `build()`. Review the output before using it in production.

---

## Quick Start

### Install

```bash
npm install @kelvinzer0/n8n-openapi-node-ultimate
```

### 3 Lines of Code

```typescript
import { N8NPropertiesBuilder, loadOpenApi } from '@kelvinzer0/n8n-openapi-node-ultimate';

const doc = await loadOpenApi('https://petstore3.swagger.io/api/v3/openapi.json');
const builder = new N8NPropertiesBuilder(doc);
const properties = builder.build();
// Done. Use `properties` in your n8n node.
```

### Or Just Use the CLI

```bash
# From URL
npx n8n-openapi-gen --input https://petstore3.swagger.io/api/v3/openapi.json --output properties.json

# From local file
npx n8n-openapi-gen --input ./openapi.yaml --output properties.json

# Pipe to stdout
npx n8n-openapi-gen --input ./openapi.json
```

| Option | Description |
|--------|-------------|
| `-i, --input <source>` | OpenAPI spec (URL or file): **required** |
| `-o, --output <file>` | Output file (defaults to stdout) |
| `--pretty` | Pretty-print JSON (default: true) |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

---

## Real-World Usage

### Build a Custom n8n Node

```typescript
import { N8NPropertiesBuilder, loadOpenApi } from '@kelvinzer0/n8n-openapi-node-ultimate';

async function generateNodeProperties(specUrl: string) {
    const doc = await loadOpenApi(specUrl);
    const builder = new N8NPropertiesBuilder(doc);
    return builder.build();
}

// Use in your n8n node definition
const properties = await generateNodeProperties('https://api.example.com/openapi.json');
```

### CI/CD: Generate on Every Build

```bash
#!/bin/bash
npx n8n-openapi-gen \
    --input https://api.example.com/openapi.json \
    --output ./n8n-node/properties.json
echo "✓ Properties generated"
```

### Load YAML Specs

```typescript
import { loadOpenApiFromFile, N8NPropertiesBuilder } from '@kelvinzer0/n8n-openapi-node-ultimate';

const doc = loadOpenApiFromFile('./my-api.yaml');
const builder = new N8NPropertiesBuilder(doc);
const properties = builder.build();
```

---

## Customize Everything

### Custom Operation Naming

```typescript
import { DefaultOperationParser, OperationContext } from '@kelvinzer0/n8n-openapi-node-ultimate';
import { OpenAPIV3 } from 'openapi-types';

class MyOperationParser extends DefaultOperationParser {
    name(operation: OpenAPIV3.OperationObject, context: OperationContext): string {
        const id = operation.operationId?.split('_').pop() || 'unknown';
        return lodash.startCase(id);
    }
}

const builder = new N8NPropertiesBuilder(doc, {
    operation: new MyOperationParser(),
});
```

### Custom Resource Naming

```typescript
import { DefaultResourceParser } from '@kelvinzer0/n8n-openapi-node-ultimate';

class MyResourceParser extends DefaultResourceParser {
    value(tag: { name: string }): string {
        return tag.name.toLowerCase().replace(/\s+/g, '-');
    }
}

const builder = new N8NPropertiesBuilder(doc, {
    resource: new MyResourceParser(),
});
```

### Override Properties

```typescript
const overrides: Override[] = [
    {
        find: { name: 'apiKey' },
        replace: { default: '={{ $credentials.apiKey }}' },
    },
];

const properties = builder.build(overrides);
```

---

## API Reference

### `N8NPropertiesBuilder(doc, config?)`

The main class. Takes a parsed OpenAPI document, returns n8n properties.

```typescript
const builder = new N8NPropertiesBuilder(doc, config?);
const properties = builder.build(overrides?);
```

### `loadOpenApi(source)`

Auto-detects URL vs file path. Loads and parses the spec.

```typescript
const doc = await loadOpenApi('https://api.example.com/openapi.json');
const doc = await loadOpenApi('./openapi.yaml');
```

### `loadOpenApiFromUrl(url)`

Fetch from URL. Supports JSON and YAML.

### `loadOpenApiFromFile(filePath)`

Load from local file. Supports JSON and YAML.

---

## FAQ

**"Does it support OpenAPI 3.1?"**
Yes. Union types, nullable types, all of it.

**"Can I load specs from a URL?"**
Yes. `loadOpenApi(url)` or CLI `--input <url>`.

**"What about Swagger 2.0?"**
Convert to OpenAPI 3.x first with [swagger2openapi](https://github.com/Mermade/swagger2openapi).

**"What about circular `$ref`s?"**
Built-in protection. Max depth of 50. Won't crash.

**"Can I customize the output?"**
Yes. Custom parsers for operations and resources, plus `Override` patterns.

**"Does it generate full CRUD (Create/Read/Update/Delete) for every resource?"**
No. It maps operations 1:1 from your OpenAPI spec. If the spec only defines `GET /users` and `POST /users`, the generated node will only have List and Create operations. It does not invent missing endpoints. Verify your spec covers the operations you need.

---

## Contributing

1. Fork → `git checkout -b feat/my-feature`
2. Commit → `git commit -m 'feat: add my feature'`
3. Push → `git push origin feat/my-feature`
4. Open a Pull Request

```bash
git clone https://github.com/kelvinzer0/n8n-openapi-node-ultimate.git
cd n8n-openapi-node-ultimate
npm install
npm run build
npm test
```

---

## Support This Project

This library was built by one developer who wanted to make n8n + OpenAPI effortless for everyone.

Your donation funds new features, more API support, and better tooling for every developer after you.

[![Keep It Moving.](https://crypto-donate.insidexofficial.workers.dev/eyJ0aXRsZSI6IktlZXAgSXQgTW92aW5nIiwiZGVzYyI6Ik9uZSBkZXZlbG9wZXIgYnVpbHQgYSB0b29sIHRoYXQgYXV0by1nZW5lcmF0ZXNcbm44biBub2RlcyBmcm9tIGFueSBPcGVuQVBJIHNwZWMuXG5cbllvdXIgZG9uYXRpb24gZnVuZHMgbmV3IGZlYXR1cmVzLCBtb3JlIEFQSSBzdXBwb3J0LFxuYW5kIGJldHRlciB0b29saW5nIGZvciBldmVyeSBkZXZlbG9wZXIgYWZ0ZXIgeW91LiIsInRhcmdldCI6NTAwMCwiYWRkcmVzc2VzIjp7ImV0aGVyZXVtIjoiMHhmMDU1NWQ0MGRiRkI0ZTNCZjA3MDQ0MjgyQjc4RjJmRTFmNTFFZjcyIiwic29sYW5hIjoiNlpEVk5BYmpZZExEcXo4cGt3VUNHYllaNVV3QlFranB0QzU1Wk5vTFcybVUifSwiZGlzY29yZCI6Imh0dHBzOi8vZGlzY29yZC5nZy9wdERaOGU0aDkzIn0/badge)](https://n8n-code.github.io/membership/#/eyJ0aXRsZSI6IktlZXAgSXQgTW92aW5nIiwiZGVzYyI6Ik9uZSBkZXZlbG9wZXIgYnVpbHQgYSB0b29sIHRoYXQgYXV0by1nZW5lcmF0ZXNcbm44biBub2RlcyBmcm9tIGFueSBPcGVuQVBJIHNwZWMuXG5cbllvdXIgZG9uYXRpb24gZnVuZHMgbmV3IGZlYXR1cmVzLCBtb3JlIEFQSSBzdXBwb3J0LFxuYW5kIGJldHRlciB0b29saW5nIGZvciBldmVyeSBkZXZlbG9wZXIgYWZ0ZXIgeW91LiIsInRhcmdldCI6NTAwMCwiYWRkcmVzc2VzIjp7ImV0aGVyZXVtIjoiMHhmMDU1NWQ0MGRiRkI0ZTNCZjA3MDQ0MjgyQjc4RjJmRTFmNTFFZjcyIiwic29sYW5hIjoiNlpEVk5BYmpZZExEcXo4cGt3VUNHYllaNVV3QlFranB0QzU1Wk5vTFcybVUifSwiZGlzY29yZCI6Imh0dHBzOi8vZGlzY29yZC5nZy9wdERaOGU0aDkzIn0)

---

## License

MIT © [kelvinzer0](https://github.com/kelvinzer0)

Based on [n8n-openapi-node](https://github.com/devlikeapro/n8n-openapi-node) by [Devlikeapro](https://github.com/devlikeapro).
