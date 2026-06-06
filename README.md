# n8n-openapi-node-ultimate

[![npm version](https://img.shields.io/npm/v/@kelvinzer0/n8n-openapi-node-ultimate.svg)](https://www.npmjs.com/package/@kelvinzer0/n8n-openapi-node-ultimate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/@kelvinzer0/n8n-openapi-node-ultimate.svg)](https://www.npmjs.com/package/@kelvinzer0/n8n-openapi-node-ultimate)
[![CI](https://github.com/kelvinzer0/n8n-openapi-node-ultimate/actions/workflows/publish.yaml/badge.svg)](https://github.com/kelvinzer0/n8n-openapi-node-ultimate/actions)

> **Turn any OpenAPI spec into n8n node properties — instantly.**
> Load from URL or file, generate via CLI or code, with full OpenAPI 3.0 & 3.1 support.

Fork of [devlikeapro/n8n-openapi-node](https://github.com/devlikeapro/n8n-openapi-node) with major enhancements: URL import, CLI tool, better schema handling, and production-ready error handling.

---

## ✨ Features

- 🔗 **URL Import** — Load OpenAPI specs directly from URLs (JSON & YAML)
- 🖥️ **CLI Tool** — Generate n8n properties from the command line
- 📄 **OpenAPI 3.0 & 3.1** — Full support including `type: ['string', 'null']` union types
- 🔧 **allOf Composition** — Proper merging of composed schemas
- 🛡️ **Circular Reference Protection** — Safe handling of recursive `$ref`s
- 📁 **$ref at Path Level** — Resolves path-level `$ref` in OpenAPI specs
- 🏷️ **Smart Naming** — Auto-generates clean names for operations without `operationId`
- 🎛️ **Customizable** — Override parsers, collectors, and behavior via config
- 📦 **Zero Config** — Works out of the box with sensible defaults

---

## 📦 Installation

```bash
npm install @kelvinzer0/n8n-openapi-node-ultimate
```

Or with yarn:

```bash
yarn add @kelvinzer0/n8n-openapi-node-ultimate
```

---

## 🚀 Quick Start

### Programmatic Usage

```typescript
import { N8NPropertiesBuilder, loadOpenApi } from '@kelvinzer0/n8n-openapi-node-ultimate';

// Load from URL
const doc = await loadOpenApi('https://petstore3.swagger.io/api/v3/openapi.json');

// Or load from local file
// const doc = await loadOpenApi('./openapi.yaml');

// Build n8n properties
const builder = new N8NPropertiesBuilder(doc);
const properties = builder.build();

console.log(JSON.stringify(properties, null, 2));
```

### CLI Usage

```bash
# From URL
npx n8n-openapi-gen --input https://petstore3.swagger.io/api/v3/openapi.json --output properties.json

# From local file
npx n8n-openapi-gen --input ./openapi.yaml --output properties.json

# Pipe to stdout
npx n8n-openapi-gen --input ./openapi.json
```

**CLI Options:**

| Option | Description |
|--------|-------------|
| `-i, --input <source>` | OpenAPI spec source (URL or file path) — **required** |
| `-o, --output <file>` | Output file path (defaults to stdout) |
| `--pretty` | Pretty-print JSON (default: true) |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

---

## 📖 API Reference

### `N8NPropertiesBuilder`

The main class for building n8n node properties from OpenAPI documents.

```typescript
const builder = new N8NPropertiesBuilder(doc, config?);
const properties = builder.build(overrides?);
```

**Constructor Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `doc` | `any` | Parsed OpenAPI document (JSON object) |
| `config` | `N8NPropertiesBuilderConfig` | Optional configuration |

**Config Options:**

```typescript
interface N8NPropertiesBuilderConfig {
    logger?: {                               // Custom logger (no external deps)
        info(obj: any, msg?: string): void;
        warn(obj: any, msg?: string): void;
    };
    OperationsCollector?: typeof BaseOperationsCollector;  // Custom operations collector
    ResourcePropertiesCollector?: typeof ResourceCollector; // Custom resource collector
    operation?: IOperationParser;            // Custom operation parser
    resource?: IResourceParser;              // Custom resource parser
}
```

### `loadOpenApi(source: string): Promise<any>`

Auto-detects whether the source is a URL or file path and loads the OpenAPI spec.

```typescript
import { loadOpenApi } from '@kelvinzer0/n8n-openapi-node-ultimate';

// URL
const doc = await loadOpenApi('https://api.example.com/openapi.json');

// Local file
const doc = await loadOpenApi('./specs/api.yaml');
```

### `loadOpenApiFromUrl(url: string): Promise<any>`

Fetch an OpenAPI spec from a URL. Supports JSON and YAML formats.

### `loadOpenApiFromFile(filePath: string): any`

Load an OpenAPI spec from a local file. Supports JSON and YAML formats.

### `Override`

Customize generated properties with find-and-replace patterns:

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

## 🎛️ Customization

### Custom Operation Parser

Control how operations are named and described:

```typescript
import { DefaultOperationParser, OperationContext } from '@kelvinzer0/n8n-openapi-node-ultimate';
import { OpenAPIV3 } from 'openapi-types';

class MyOperationParser extends DefaultOperationParser {
    name(operation: OpenAPIV3.OperationObject, context: OperationContext): string {
        // Custom naming logic
        const id = operation.operationId?.split('_').pop() || 'unknown';
        return lodash.startCase(id);
    }
}

const builder = new N8NPropertiesBuilder(doc, {
    operation: new MyOperationParser(),
});
```

### Custom Resource Parser

Control how resources (tags) are named:

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

---

## 💡 Use Cases

### Building a Custom n8n Node

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

### CI/CD Pipeline — Generate Properties on Build

```bash
#!/bin/bash
# generate-props.sh
npx n8n-openapi-gen \
    --input https://api.example.com/openapi.json \
    --output ./n8n-node/properties.json
echo "Generated n8n properties"
```

### Loading YAML Specs

```typescript
import { loadOpenApiFromFile, N8NPropertiesBuilder } from '@kelvinzer0/n8n-openapi-node-ultimate';

const doc = loadOpenApiFromFile('./my-api.yaml');
const builder = new N8NPropertiesBuilder(doc);
const properties = builder.build();
```

---

## ❓ FAQ

**Q: Does it support OpenAPI 3.1?**
A: Yes! Including `type: ['string', 'null']` union types and other 3.1 features.

**Q: Can I load specs from a URL?**
A: Yes! Use `loadOpenApi(url)` or the CLI with `--input <url>`.

**Q: Does it support Swagger 2.0?**
A: Not directly. Convert your Swagger 2.0 spec to OpenAPI 3.x first using tools like [swagger2openapi](https://github.com/Mermade/swagger2openapi).

**Q: What about circular `$ref`s?**
A: The library has built-in circular reference protection with a max depth of 50.

**Q: Can I customize the output format?**
A: Yes! Use custom parsers for operations and resources, or use `Override` patterns to modify generated properties.

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/my-feature`
3. **Commit** your changes: `git commit -m 'feat: add my feature'`
4. **Push** to the branch: `git push origin feat/my-feature`
5. **Open** a Pull Request

### Development

```bash
# Clone
git clone https://github.com/kelvinzer0/n8n-openapi-node-ultimate.git
cd n8n-openapi-node-ultimate

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

---


## 📄 License

MIT © [kelvinzer0](https://github.com/kelvinzer0)

Based on [n8n-openapi-node](https://github.com/devlikeapro/n8n-openapi-node) by [Devlikeapro](https://github.com/devlikeapro).
