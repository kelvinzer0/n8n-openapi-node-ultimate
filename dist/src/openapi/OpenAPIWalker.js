"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPIWalker = void 0;
const openapi_types_1 = require("openapi-types");
const HttpMethods = Object.values(openapi_types_1.OpenAPIV3.HttpMethods);
class OpenAPIWalker {
    constructor(doc) {
        this.doc = doc;
    }
    walk(visitor) {
        this.walkDocument(visitor);
        this.walkPaths(visitor);
        this.walkTags(visitor);
        if (visitor.finish) {
            visitor.finish();
        }
    }
    walkDocument(visitor, doc) {
        if (!doc) {
            doc = this.doc;
        }
        if (visitor.visitDocument) {
            visitor.visitDocument(doc);
        }
    }
    walkPaths(visitor, paths) {
        if (!paths) {
            paths = this.doc.paths;
        }
        if (!paths) {
            return;
        }
        for (const path in paths) {
            let pathItem = paths[path];
            // Resolve $ref at path level
            if ('$ref' in pathItem) {
                const ref = pathItem['$ref'];
                pathItem = this.resolvePathRef(ref);
            }
            let method;
            let operation;
            for ([method, operation] of Object.entries(pathItem)) {
                if (!HttpMethods.includes(method)) {
                    continue;
                }
                if (!operation.tags || operation.tags.length === 0) {
                    operation.tags = ['default'];
                }
                if (operation && visitor.visitOperation) {
                    const context = { pattern: path, path: pathItem, method: method };
                    visitor.visitOperation(operation, context);
                }
            }
        }
    }
    resolvePathRef(ref) {
        const refPath = ref.split('/').slice(1);
        let schema = this.doc;
        for (const segment of refPath) {
            schema = schema[segment];
            if (!schema) {
                throw new Error(`Path $ref not found: '${ref}'`);
            }
        }
        return schema;
    }
    walkTags(visitor, tags) {
        if (!tags) {
            tags = this.doc.tags;
        }
        if (!tags) {
            return;
        }
        if (!visitor.visitTag) {
            return;
        }
        for (const tag of tags) {
            visitor.visitTag(tag);
        }
    }
}
exports.OpenAPIWalker = OpenAPIWalker;
//# sourceMappingURL=OpenAPIWalker.js.map