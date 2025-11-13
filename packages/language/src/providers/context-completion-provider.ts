/**
 * ContextCompletionProvider - Provides completions for Liquid context objects
 * Supports product.*, collection.*, shop.*, and custom loop variables
 * Ported from extension_vs/src/contextCompletion.ts
 */

import { CompletionAcceptor, CompletionContext, CompletionValueItem } from 'langium/lsp';

export class ContextCompletionProvider {
    /**
     * Provide context-aware completions for Liquid objects
     */
    async provideCompletions(
        context: CompletionContext,
        acceptor: CompletionAcceptor
    ): Promise<void> {
        const textBeforeCursor = context.textDocument.getText({
            start: { line: 0, character: 0 },
            end: context.position
        });

        // Check if we're accessing a property (e.g., "product.")
        const propertyAccessMatch = textBeforeCursor.match(/(\w+)\.$/);

        if (propertyAccessMatch) {
            const objectName = propertyAccessMatch[1];

            // Check if it's a known context object
            if (objectName === 'product') {
                this.provideProductCompletions(context, acceptor);
            } else if (objectName === 'collection') {
                this.provideCollectionCompletions(context, acceptor);
            } else if (objectName === 'shop') {
                this.provideShopCompletions(context, acceptor);
            } else {
                // Check if it's a loop variable
                const loopVariable = this.findLoopVariable(textBeforeCursor, objectName);
                if (loopVariable) {
                    this.provideLoopVariableCompletions(context, acceptor, loopVariable.collectionType);
                }
            }
        }
        // Check if we're in a for-loop context to suggest iterables
        else if (this.isInForLoopContext(textBeforeCursor)) {
            this.provideForLoopIterableCompletions(context, acceptor);
        }
    }

    /**
     * Check if we're in a for-loop "in" context
     */
    private isInForLoopContext(text: string): boolean {
        // Match {% for variable in |
        return /\{%\s*for\s+\w+\s+in\s+$/.test(text);
    }

    /**
     * Find loop variable information from previous for-loops
     */
    private findLoopVariable(text: string, variableName: string): { collectionType: string } | null {
        const lines = text.split('\n').slice(-50); // Last 50 lines

        for (let i = lines.length - 1; i >= 0; i--) {
            // Match {% for variableName in something %}
            const forLoopMatch = lines[i].match(
                new RegExp(`\\{%\\s*for\\s+${variableName}\\s+in\\s+(\\w+(?:\\.\\w+)*)`)
            );

            if (forLoopMatch) {
                const collection = forLoopMatch[1];

                // Determine the type based on collection name
                if (collection.includes('products') || collection === 'all_products') {
                    return { collectionType: 'product' };
                } else if (collection.includes('collections')) {
                    return { collectionType: 'collection' };
                } else if (collection.includes('variants')) {
                    return { collectionType: 'variant' };
                }

                // Default to product for unknown collections
                return { collectionType: 'product' };
            }
        }

        return null;
    }

    /**
     * Provide product property completions
     */
    private provideProductCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        const properties = [
            { name: 'id', type: 'string', description: 'Unique product identifier' },
            { name: 'title', type: 'string', description: 'Product title' },
            { name: 'handle', type: 'string', description: 'URL-friendly product identifier' },
            { name: 'description', type: 'string', description: 'Product description' },
            { name: 'price', type: 'number', description: 'Product price' },
            { name: 'compareAtPrice', type: 'number', description: 'Original price for comparison' },
            { name: 'vendor', type: 'string', description: 'Product vendor/brand' },
            { name: 'type', type: 'string', description: 'Product type/category' },
            { name: 'tags', type: 'array', description: 'Product tags' },
            { name: 'variants', type: 'array', description: 'Product variants' },
            { name: 'images', type: 'array', description: 'Product images' },
            { name: 'featuredImage', type: 'object', description: 'Main product image' },
            { name: 'available', type: 'boolean', description: 'Product availability status' },
            { name: 'url', type: 'string', description: 'Product page URL' },
            { name: 'priceMax', type: 'number', description: 'Maximum variant price' },
            { name: 'priceMin', type: 'number', description: 'Minimum variant price' },
            { name: 'selectedVariant', type: 'object', description: 'Currently selected variant' },
        ];

        for (const prop of properties) {
            const completionItem: CompletionValueItem = {
                label: prop.name,
                kind: 10, // CompletionItemKind.Property
                detail: `(${prop.type}) ${prop.description}`,
                documentation: prop.description,
                insertText: prop.name,
                sortText: `0_${prop.name}`,
            };

            acceptor(context, completionItem);
        }
    }

    /**
     * Provide collection property completions
     */
    private provideCollectionCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        const properties = [
            { name: 'id', type: 'string', description: 'Unique collection identifier' },
            { name: 'title', type: 'string', description: 'Collection title' },
            { name: 'handle', type: 'string', description: 'URL-friendly collection identifier' },
            { name: 'description', type: 'string', description: 'Collection description' },
            { name: 'products', type: 'array', description: 'Products in this collection' },
            { name: 'productsCount', type: 'number', description: 'Number of products in collection' },
            { name: 'image', type: 'object', description: 'Collection image' },
            { name: 'url', type: 'string', description: 'Collection page URL' },
        ];

        for (const prop of properties) {
            const completionItem: CompletionValueItem = {
                label: prop.name,
                kind: 10, // CompletionItemKind.Property
                detail: `(${prop.type}) ${prop.description}`,
                documentation: prop.description,
                insertText: prop.name,
                sortText: `0_${prop.name}`,
            };

            acceptor(context, completionItem);
        }
    }

    /**
     * Provide shop property completions
     */
    private provideShopCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        const properties = [
            { name: 'id', type: 'string', description: 'Unique shop identifier' },
            { name: 'name', type: 'string', description: 'Shop name' },
            { name: 'domain', type: 'string', description: 'Shop domain' },
            { name: 'email', type: 'string', description: 'Shop contact email' },
            { name: 'currency', type: 'string', description: 'Shop currency code' },
            { name: 'locale', type: 'string', description: 'Shop locale/language' },
            { name: 'moneyFormat', type: 'string', description: 'Currency formatting pattern' },
        ];

        for (const prop of properties) {
            const completionItem: CompletionValueItem = {
                label: prop.name,
                kind: 10, // CompletionItemKind.Property
                detail: `(${prop.type}) ${prop.description}`,
                documentation: prop.description,
                insertText: prop.name,
                sortText: `0_${prop.name}`,
            };

            acceptor(context, completionItem);
        }
    }

    /**
     * Provide completions for loop variables based on their collection type
     */
    private provideLoopVariableCompletions(context: CompletionContext, acceptor: CompletionAcceptor, collectionType: string): void {
        if (collectionType === 'product') {
            this.provideProductCompletions(context, acceptor);
        } else if (collectionType === 'collection') {
            this.provideCollectionCompletions(context, acceptor);
        } else if (collectionType === 'variant') {
            this.provideVariantCompletions(context, acceptor);
        }
    }

    /**
     * Provide variant property completions
     */
    private provideVariantCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        const properties = [
            { name: 'id', type: 'string', description: 'Unique variant identifier' },
            { name: 'title', type: 'string', description: 'Variant title' },
            { name: 'price', type: 'number', description: 'Variant price' },
            { name: 'compareAtPrice', type: 'number', description: 'Original price for comparison' },
            { name: 'sku', type: 'string', description: 'Stock keeping unit' },
            { name: 'available', type: 'boolean', description: 'Variant availability' },
            { name: 'inventoryQuantity', type: 'number', description: 'Available inventory' },
            { name: 'option1', type: 'string', description: 'First option value (e.g., Size)' },
            { name: 'option2', type: 'string', description: 'Second option value (e.g., Color)' },
            { name: 'option3', type: 'string', description: 'Third option value' },
            { name: 'weight', type: 'number', description: 'Variant weight' },
            { name: 'image', type: 'object', description: 'Variant image' },
        ];

        for (const prop of properties) {
            const completionItem: CompletionValueItem = {
                label: prop.name,
                kind: 10, // CompletionItemKind.Property
                detail: `(${prop.type}) ${prop.description}`,
                documentation: prop.description,
                insertText: prop.name,
                sortText: `0_${prop.name}`,
            };

            acceptor(context, completionItem);
        }
    }

    /**
     * Provide iterable suggestions for for-loops
     */
    private provideForLoopIterableCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        const iterables = [
            { name: 'products', description: 'All products in current scope' },
            { name: 'collections', description: 'All collections' },
            { name: 'collection.products', description: 'Products in the current collection' },
            { name: 'product.variants', description: 'Variants of the current product' },
            { name: 'product.images', description: 'Images of the current product' },
            { name: 'all_products', description: 'All products in the store' },
        ];

        for (const iterable of iterables) {
            const completionItem: CompletionValueItem = {
                label: iterable.name,
                kind: 6, // CompletionItemKind.Variable
                detail: iterable.description,
                documentation: iterable.description,
                insertText: iterable.name,
                sortText: `0_${iterable.name}`,
            };

            acceptor(context, completionItem);
        }
    }
}
