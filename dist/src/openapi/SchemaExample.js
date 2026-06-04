"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaExample = void 0;
const RefResolver_1 = require("./RefResolver");
class SchemaExampleBuilder {
    constructor(resolver) {
        this.resolver = resolver;
        this.visitedRefs = new Set();
    }
    build(schema) {
        let refs;
        [schema, refs] = this.resolver.resolveRef(schema);
        if (refs) {
            // Prevent infinite recursion
            for (const ref of refs) {
                if (this.visitedRefs.has(ref)) {
                    return {};
                }
                this.visitedRefs.add(ref);
            }
        }
        if ('oneOf' in schema) {
            return this.build(schema.oneOf[0]);
        }
        if ('allOf' in schema) {
            const examples = schema.allOf.map((s) => this.build(s));
            return Object.assign({}, ...examples);
        }
        if (schema.example !== undefined) {
            return schema.example;
        }
        if (schema.default !== undefined) {
            return schema.default;
        }
        if (schema.properties) {
            const obj = {};
            for (const key in schema.properties) {
                obj[key] = this.build(schema.properties[key]);
            }
            return obj;
        }
        if ('items' in schema && schema.items) {
            return [this.build(schema.items)];
        }
        return undefined;
    }
}
class SchemaExample {
    constructor(doc) {
        this.resolver = new RefResolver_1.RefResolver(doc);
    }
    extractExample(schema) {
        return new SchemaExampleBuilder(this.resolver).build(schema);
    }
}
exports.SchemaExample = SchemaExample;
//# sourceMappingURL=SchemaExample.js.map