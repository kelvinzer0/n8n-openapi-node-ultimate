import {OpenAPIV3} from "openapi-types";
import * as lodash from "lodash";

const MAX_REF_DEPTH = 50;

export class RefResolver {
    constructor(private doc: any) {

    }

    /**
     * Resolve ref and return it if found
     * @param schema
     */
    resolveRef<T>(schema: OpenAPIV3.ReferenceObject | T): [T, string[]?] {
        return this._resolveRef<T>(schema, new Set<string>(), 0);
    }

    private _resolveRef<T>(schema: OpenAPIV3.ReferenceObject | T, visited: Set<string>, depth: number): [T, string[]?] {
        if (depth > MAX_REF_DEPTH) {
            throw new Error(`Max reference depth (${MAX_REF_DEPTH}) exceeded — possible circular reference`);
        }

        // @ts-ignore
        if ("properties" in schema) {
            return [schema as T, undefined]
        }
        // @ts-ignore
        if ("oneOf" in schema) {
            // @ts-ignore
            schema = schema.oneOf[0]
        }
        // @ts-ignore
        if ("anyOf" in schema) {
            // @ts-ignore
            schema = schema.anyOf[0]
        }
        // @ts-ignore
        if ("allOf" in schema) {
            // @ts-ignore
            const results = schema.allOf.map((s) => this._resolveRef(s, visited, depth + 1));
            const schemas = results.map((r: any) => r[0]);
            const refs = results.map((r: any) => r[1]);
            const refsFlat = lodash.flatten<string>(refs);
            const object = Object.assign({}, ...schemas);
            return [object as T, refsFlat]
        }
        // @ts-ignore
        if ('$ref' in schema) {
            const ref: string = schema['$ref'];
            if (visited.has(ref)) {
                // Circular reference detected — return schema without resolving further
                return [schema as T, [ref]];
            }
            visited.add(ref);
            const schemaResolved = this.findRef(ref);
            // Remove $ref from schema, add all other properties
            const {$ref, ...rest} = schema;
            Object.assign(rest, schemaResolved);
            return [rest as T, [ref]]
        }
        return [schema as T, undefined]
    }

    resolve<T>(schema: OpenAPIV3.ReferenceObject | T): T {
        return this.resolveRef(schema)[0]
    }

    private findRef(ref: string): OpenAPIV3.SchemaObject {
        const refPath = ref.split('/').slice(1);
        let schema: any = this.doc;
        for (const path of refPath) {
            // @ts-ignore
            schema = schema[path];
            if (!schema) {
                throw new Error(`Schema not found for ref '${ref}'`);
            }
        }
        if ('$ref' in schema) {
            return this.findRef(schema['$ref']);
        }
        return schema;
    }
}
