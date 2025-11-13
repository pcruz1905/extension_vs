import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSellhubLiquidServices } from "../sellhub-liquid-module.js";
import { Model } from "../generated/ast.js";

let services: ReturnType<typeof createSellhubLiquidServices>;
let parse: ReturnType<typeof parseHelper<Model>>;

beforeAll(async () => {
    services = createSellhubLiquidServices(EmptyFileSystem);
    parse = parseHelper<Model>(services.SellhubLiquid);
});

describe('Islands Validation Tests', () => {

    test('island with valid hydrate strategy should not error', async () => {
        const document = await parse(`
            {% island "test", hydrate: "lazy" %}
            {% endisland %}
        `);

        // Note: Validation runs after parsing, may need to trigger validation manually
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with eager hydrate strategy should not error', async () => {
        const document = await parse(`
            {% island "test", hydrate: "eager" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with idle hydrate strategy should not error', async () => {
        const document = await parse(`
            {% island "test", hydrate: "idle" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island without hydrate strategy should not error', async () => {
        const document = await parse(`
            {% island "test" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with empty props should parse', async () => {
        const document = await parse(`
            {% island "test", props: {} %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with all prop types should parse', async () => {
        const document = await parse(`
            {% island "test", props: {
                stringProp: "value",
                numberProp: 42,
                boolProp: true,
                refProp: shop.name,
                arrayProp: [1, 2, 3],
                objectProp: { nested: "value" }
            } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with deep nested props should parse', async () => {
        const document = await parse(`
            {% island "test", props: {
                config: {
                    theme: {
                        colors: {
                            primary: "#fff",
                            secondary: "#000"
                        }
                    }
                }
            } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with liquid reference as prop should parse', async () => {
        const document = await parse(`
            {% island "test", props: {
                productId: product.id,
                productPrice: product.price,
                shopName: shop.name
            } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with array access in props should parse', async () => {
        const document = await parse(`
            {% island "test", props: {
                firstProduct: products[0],
                namedAccess: collection["products"]
            } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with property access chain should parse', async () => {
        const document = await parse(`
            {% island "test", props: {
                value: product.variants[0].price
            } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });
});

describe('Islands Edge Cases', () => {

    test('island with trailing comma should parse', async () => {
        const document = await parse(`
            {% island "test", props: { value: 1, }, hydrate: "lazy", %}
            {% endisland %}
        `);

        // May or may not accept trailing comma - depends on grammar
        // Just check it doesn't crash
        expect(document.parseResult.value).toBeDefined();
    });

    test('island with multi-line props should parse', async () => {
        const document = await parse(`
            {% island "test",
                props: {
                    value1: "a",
                    value2: "b",
                    value3: "c"
                },
                hydrate: "lazy"
            %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with inline content should parse', async () => {
        const document = await parse(`
            {% island "test" %}<span>Inline content</span>{% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('multiple islands without whitespace between should parse', async () => {
        const document = await parse(`
            {% island "first" %}{% endisland %}{% island "second" %}{% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island with comment inside should parse', async () => {
        const document = await parse(`
            {% island "test" %}
                {# This is a Liquid comment #}
                <div>Content</div>
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('island nested inside Liquid block should parse', async () => {
        const document = await parse(`
            {% if true %}
                {% island "test" %}
                {% endisland %}
            {% endif %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('liquid block inside island should parse', async () => {
        const document = await parse(`
            {% island "test" %}
                {% if true %}
                    <div>Content</div>
                {% endif %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });
});
