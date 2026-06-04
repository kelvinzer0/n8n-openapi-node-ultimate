import { OpenAPIVisitor } from "./OpenAPIVisitor";
export declare class OpenAPIWalker {
    private readonly doc;
    constructor(doc: any);
    walk(visitor: OpenAPIVisitor): void;
    private walkDocument;
    private walkPaths;
    private resolvePathRef;
    private walkTags;
}
