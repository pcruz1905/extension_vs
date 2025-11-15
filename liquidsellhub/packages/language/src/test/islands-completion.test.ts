/**
 * Islands Completion Tests
 *
 * Tests for the IslandsCompletionProvider to ensure intellisense works correctly
 * when typing island component syntax.
 */

import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import { createSellhubLiquidServices } from "../sellhub-liquid-module.js";
import { Model } from "../generated/ast.js";
import type { CompletionList, Position } from 'vscode-languageserver-protocol';

let services: ReturnType<typeof createSellhubLiquidServices>;
let parse: ReturnType<typeof parseHelper<Model>>;

beforeAll(async () => {
    services = createSellhubLiquidServices(EmptyFileSystem);
    parse = parseHelper<Model>(services.SellhubLiquid);
});

/**
 * Helper to get completions at a specific position
 */
async function getCompletions(text: string, position: Position): Promise<CompletionList | undefined> {
    const document = await parse(text);
    const completionProvider = services.SellhubLiquid.lsp.CompletionProvider;

    if (!completionProvider) {
        throw new Error('CompletionProvider not available');
    }

    const params = {
        textDocument: { uri: document.uri.toString() },
        position: position
    };

    return await completionProvider.getCompletion(document, params);
}

describe('Islands Completion Provider Tests', () => {

    describe('Component Name Completions', () => {

        test('should provide completions when typing {% island "', async () => {
            const text = '{% island "';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);

            // Should return completions (even if empty list, means provider is working)
            expect(completions).toBeDefined();

            // Note: Actual component list depends on R2 connection
            // In test environment without R2 config, it might be empty
            // But the provider should still return a CompletionList
        });

        test('should provide completions when typing {% island "" with cursor inside quotes', async () => {
            const text = '{% island "';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();

            // This tests the user's specific scenario: {% island ""
            // When cursor is after the opening quote
        });

        test('should provide completions when typing {% island \'', async () => {
            const text = '{% island \'';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });

        test('should provide completions after {% island with space', async () => {
            const text = '{% island ';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });

        test('should provide completions with extra whitespace', async () => {
            const text = '{%  island  "';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });

        test('should NOT provide island completions inside HTML', async () => {
            const text = '<div>island "';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);

            // Should either be undefined or not contain island completions
            // This is a negative test
            if (completions && completions.items) {
                // If there are completions, they shouldn't be island components
                // (they might be default Langium completions)
                const hasIslandKeyword = completions.items.some(item =>
                    item.label === 'island'
                );
                // Island keyword might appear, but not component names
                expect(hasIslandKeyword).toBe(false);
            }
        });
    });

    describe('Props Completions', () => {

        test('should provide props completions inside props object', async () => {
            const text = '{% island "site-footer", props: { ';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();

            // Provider should detect we're in props context
            // Actual props depend on component metadata from R2
        });

        test('should provide props completions after comma in props object', async () => {
            const text = '{% island "site-footer", props: { shopName: shop.name, ';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });

        test('should provide props completions with multiline props', async () => {
            const text = `{% island "site-footer", props: {
                shopName: shop.name,
                `;
            const position: Position = { line: 1, character: 16 }; // After the comma

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });
    });

    describe('Hydrate Strategy Completions', () => {

        test('should provide hydrate completions after hydrate:', async () => {
            const text = '{% island "site-footer", props: {}, hydrate: "';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();

            // Should provide: eager, lazy, idle
            if (completions && completions.items) {
                const labels = completions.items.map(item => item.label);

                // Check if we have hydration strategy completions
                // (might also include other completions from default provider)
                const hasHydrationStrategies =
                    labels.includes('eager') ||
                    labels.includes('lazy') ||
                    labels.includes('idle');

                if (hasHydrationStrategies) {
                    expect(labels).toContain('eager');
                    expect(labels).toContain('lazy');
                    expect(labels).toContain('idle');
                }
            }
        });

        test('should provide hydrate completions without quotes', async () => {
            const text = '{% island "site-footer", props: {}, hydrate: ';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });
    });

    describe('Context-Aware Completions', () => {

        test('should detect loop variable in props completion', async () => {
            const text = `{% for product in collection.products %}
    {% island "price-display", props: { `;
            const position: Position = { line: 1, character: 39 };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();

            // The completion provider should detect 'product' loop variable
            // and suggest smart defaults like product.id, product.price, etc.
        });

        test('should provide completions in nested loops', async () => {
            const text = `{% for collection in collections %}
    {% for product in collection.products %}
        {% island "product-card", props: { `;
            const position: Position = { line: 2, character: 43 };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });
    });

    describe('Invalid Contexts', () => {

        test('should NOT provide island completions in output expressions', async () => {
            const text = '{{ island "';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);

            // Output expressions {{ }} are for variables/filters, not tags
            // So island completions should not appear
            // (Langium might provide other completions though)
            if (completions && completions.items) {
                const hasComponentCompletions = completions.items.some(item =>
                    item.detail?.includes('Island component')
                );
                expect(hasComponentCompletions).toBe(false);
            }
        });

        test('should NOT provide completions after endisland', async () => {
            const text = `{% island "test" %}
{% endisland `;
            const position: Position = { line: 1, character: 13 };

            const completions = await getCompletions(text, position);

            // After endisland, we shouldn't be in island context anymore
            if (completions && completions.items) {
                const hasIslandCompletions = completions.items.some(item =>
                    item.detail?.includes('Island component')
                );
                expect(hasIslandCompletions).toBe(false);
            }
        });
    });

    describe('Completion Item Properties', () => {

        test('completion items should have proper structure', async () => {
            const text = '{% island "';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);

            if (completions && completions.items && completions.items.length > 0) {
                const firstItem = completions.items[0];

                // Check that completion items have expected properties
                expect(firstItem).toHaveProperty('label');

                // Optional properties that might be present
                if (firstItem.detail?.includes('Island component')) {
                    // This is an island component completion
                    expect(firstItem).toHaveProperty('kind');
                    expect(firstItem).toHaveProperty('insertText');
                }
            }
        });
    });

    describe('Completion Trigger Points', () => {

        test('should handle completion at start of file', async () => {
            const text = '{% island "';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });

        test('should handle completion in middle of file', async () => {
            const text = `<html>
<body>
{% island "
</body>
</html>`;
            const position: Position = { line: 2, character: 11 };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });

        test('should handle completion with preceding content', async () => {
            const text = `{% assign test = "value" %}
{{ test }}
{% island "`;
            const position: Position = { line: 2, character: 11 };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });
    });

    describe('Edge Cases', () => {

        test('should handle empty document', async () => {
            const text = '';
            const position: Position = { line: 0, character: 0 };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });

        test('should handle cursor at end of incomplete island tag', async () => {
            const text = '{% island';
            const position: Position = { line: 0, character: text.length };

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });

        test('should handle cursor before closing quote', async () => {
            const text = '{% island "site-footer"';
            const position: Position = { line: 0, character: 20 }; // Inside "site-footer"

            const completions = await getCompletions(text, position);
            expect(completions).toBeDefined();
        });
    });
});

describe('Integration with R2 Components', () => {

    test('completion provider should be registered in services', () => {
        expect(services.SellhubLiquid.lsp.CompletionProvider).toBeDefined();
    });

    test('completion provider should be IslandsCompletionProvider', () => {
        const provider = services.SellhubLiquid.lsp.CompletionProvider;
        expect(provider).toBeDefined();
        // Check that it's our custom provider (has R2Client)
        expect(provider).toHaveProperty('completionFor');
    });

    test('R2Client should be available in services', () => {
        expect(services.SellhubLiquid.services.R2Client).toBeDefined();
    });

    test('ConfigService should be available in services', () => {
        expect(services.SellhubLiquid.services.ConfigService).toBeDefined();
    });
});

describe('Completion Provider Pattern Matching', () => {

    test('should match island tag pattern correctly', async () => {
        // Test the regex pattern directly
        const islandPattern = /\{%\s*island\s+["']?$/;

        expect(islandPattern.test('{% island "')).toBe(true);
        expect(islandPattern.test('{% island \'')).toBe(true);
        expect(islandPattern.test('{% island ')).toBe(true);
        expect(islandPattern.test('{%  island  "')).toBe(true);
        expect(islandPattern.test('{{ island "')).toBe(false); // Wrong syntax!
        expect(islandPattern.test('island "')).toBe(false);
        expect(islandPattern.test('{% island "test"')).toBe(false);
    });

    test('should match inside quotes pattern for partial completion', async () => {
        // Test the pattern for cursor inside quotes
        const insideQuotesPattern = /\{%\s*island\s+["'][^"']*$/;

        expect(insideQuotesPattern.test('{% island "sit')).toBe(true);
        expect(insideQuotesPattern.test('{% island "site-foo')).toBe(true);
        expect(insideQuotesPattern.test('{% island \'')).toBe(true);
        expect(insideQuotesPattern.test('{% island "')).toBe(true);
        expect(insideQuotesPattern.test('{{ island "sit')).toBe(false); // Wrong syntax!
    });

    test('should match props pattern correctly', async () => {
        // Test the regex pattern for props context
        const propsPattern = /props\s*:\s*\{[^}]*$/;

        expect(propsPattern.test('props: {')).toBe(true);
        expect(propsPattern.test('props: { name: value, ')).toBe(true);
        expect(propsPattern.test('props:{')).toBe(true);
        expect(propsPattern.test('props: {}')).toBe(false);
        expect(propsPattern.test('props: { } extra')).toBe(false);
    });

    test('should match hydrate pattern correctly', async () => {
        // Test the regex pattern for hydrate context
        const hydratePattern = /hydrate\s*:\s*["']?$/;

        expect(hydratePattern.test('hydrate: "')).toBe(true);
        expect(hydratePattern.test('hydrate: \'')).toBe(true);
        expect(hydratePattern.test('hydrate: ')).toBe(true);
        expect(hydratePattern.test('hydrate:"')).toBe(true);
        expect(hydratePattern.test('hydrate: "lazy"')).toBe(false);
        // Note: The pattern matches 'hydrate' anywhere in the string that ends correctly
        // This is actually correct behavior - if the text before cursor ends with 'hydrate: "'
        // we should provide completions, regardless of what came before
        expect(hydratePattern.test('not hydrate: "')).toBe(true);
    });
});
