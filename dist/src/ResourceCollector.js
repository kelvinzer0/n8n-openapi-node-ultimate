"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceCollector = void 0;
/**
 * Collects resource properties from OpenAPI document
 * Resource is basically tags from OpenAPI spec
 */
class ResourceCollector {
    constructor(resourceParser) {
        this.resourceParser = resourceParser;
        this.tagsOrder = new Map();
        this.tags = new Map();
    }
    get resources() {
        const tags = this.sortedTags;
        const parser = this.resourceParser;
        const options = tags.map((tag) => {
            return {
                name: parser.name(tag),
                value: parser.value(tag),
                description: parser.description(tag),
            };
        });
        return {
            displayName: 'Resource',
            name: 'resource',
            type: 'options',
            noDataExpression: true,
            options: options,
            default: '',
        };
    }
    get sortedTags() {
        const tags = Array.from(this.tags.values());
        tags.sort((a, b) => {
            return this.tagsOrder.get(a.name) - this.tagsOrder.get(b.name);
        });
        // put "default" at the end if not present explicitly in 'tags"
        if (!this.tagsOrder.has('default')) {
            const defaultTag = tags.find((tag) => tag.name === 'default');
            if (defaultTag) {
                tags.splice(tags.indexOf(defaultTag), 1);
                tags.push(defaultTag);
            }
        }
        return tags;
    }
    visitOperation(operation, context) {
        let tags = operation.tags;
        tags.forEach((tag) => this.addTagByName(tag));
    }
    addTagByName(tag) {
        // insert if not found
        if (!this.tags.has(tag)) {
            this.tags.set(tag, {
                name: tag,
                description: '',
            });
        }
    }
    visitTag(tag) {
        const name = tag.name;
        this.tags.set(name, {
            name: name,
            description: tag.description || '',
        });
        this.tagsOrder.set(name, this.tagsOrder.size);
    }
}
exports.ResourceCollector = ResourceCollector;
//# sourceMappingURL=ResourceCollector.js.map