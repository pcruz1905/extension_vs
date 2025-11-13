import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSellhubLiquidServices } from "../sellhub-liquid-module.js";
import { Model, isIslandTag } from "../generated/ast.js";

let services: ReturnType<typeof createSellhubLiquidServices>;
let parse: ReturnType<typeof parseHelper<Model>>;

beforeAll(async () => {
    services = createSellhubLiquidServices(EmptyFileSystem);
    parse = parseHelper<Model>(services.SellhubLiquid);
});

describe('Islands Parsing Tests', () => {

    test('parse island with props and hydrate (footer.liquid example)', async () => {
        const document = await parse(`
            {% island "site-footer", props: { shopName: shop.name, year: "2025" }, hydrate: "lazy" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
        expect(document.parseResult.value.elements).toHaveLength(1);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);

        if (isIslandTag(island)) {
            expect(island.name).toBe('site-footer');
            expect(island.hydrate).toBe('lazy');
            expect(island.props).toBeDefined();
        }
    });

    test('parse island with complex props (collection.liquid example)', async () => {
        const document = await parse(`
            {% island "price-display", props: { amount: product.price, currency: "USD", compareAtPrice: product.compareAtPrice }, hydrate: "lazy" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
        expect(document.parseResult.value.elements).toHaveLength(1);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);
    });

    test('parse island with eager hydration (product.liquid example)', async () => {
        const document = await parse(`
            {% island "price-display", props: { amount: product.price, currency: "USD", compareAtPrice: product.compareAtPrice }, hydrate: "eager" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);

        if (isIslandTag(island)) {
            expect(island.hydrate).toBe('eager');
        }
    });

    test('parse island with number props', async () => {
        const document = await parse(`
            {% island "cart-counter", props: { productId: product.id, productTitle: product.title, count: 0 }, hydrate: "lazy" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);
    });

    test('parse island with only name (minimal)', async () => {
        const document = await parse(`
            {% island "my-component" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);

        if (isIslandTag(island)) {
            expect(island.name).toBe('my-component');
            expect(island.props).toBeUndefined();
            expect(island.hydrate).toBeUndefined();
        }
    });

    test('parse island with props only (no hydrate)', async () => {
        const document = await parse(`
            {% island "component", props: { value: "test" } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);

        if (isIslandTag(island)) {
            expect(island.props).toBeDefined();
            expect(island.hydrate).toBeUndefined();
        }
    });

    test('parse island with HTML content inside', async () => {
        const document = await parse(`
            {% island "card" %}
                <div class="card">
                    <h1>Hello World</h1>
                </div>
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);

        if (isIslandTag(island)) {
            expect(island.content.length).toBeGreaterThan(0);
        }
    });

    test('parse multiple islands in one file', async () => {
        const document = await parse(`
            {% island "first", props: { value: 1 } %}
            {% endisland %}

            <div>Some HTML</div>

            {% island "second", props: { value: 2 }, hydrate: "lazy" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const islands = document.parseResult.value.elements.filter(isIslandTag);
        expect(islands.length).toBe(2);
    });

    test('parse island with nested Liquid output', async () => {
        const document = await parse(`
            {% island "component" %}
                <div>{{ product.title }}</div>
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse island with array props', async () => {
        const document = await parse(`
            {% island "list", props: { items: [1, 2, 3], labels: ["a", "b", "c"] } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);
    });

    test('parse island with nested object props', async () => {
        const document = await parse(`
            {% island "complex", props: { config: { theme: "dark", size: "large" } } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);
    });

    test('parse island with boolean props', async () => {
        const document = await parse(`
            {% island "toggle", props: { enabled: true, visible: false } %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);
    });

    test('parse island with ID name (unquoted)', async () => {
        const document = await parse(`
            {% island my-component %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        const island = document.parseResult.value.elements[0];
        expect(isIslandTag(island)).toBe(true);

        if (isIslandTag(island)) {
            expect(island.name).toBe('my-component');
        }
    });
});

describe('Standard Liquid Pass-through Tests', () => {

    test('parse Liquid output with filters', async () => {
        const document = await parse(`
            {{ shop.locale | default: 'en' }}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse complex Liquid output', async () => {
        const document = await parse(`
            {{ shop.id }}" style="color:#fff;text-decoration:none;
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse Liquid if block', async () => {
        const document = await parse(`
            {% if condition %}
                <div>True</div>
            {% endif %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse Liquid for loop', async () => {
        const document = await parse(`
            {% for product in collection.products %}
                {{ product.title }}
            {% endfor %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse Liquid assign', async () => {
        const document = await parse(`
            {% assign myVar = shop.name %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse unknown Liquid tag', async () => {
        const document = await parse(`
            {% section 'header' %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse mixed Islands and standard Liquid', async () => {
        const document = await parse(`
            <!doctype html>
            <html lang="{{ shop.locale | default: 'en' }}">
            <head>
                <title>{{ page_title | default: shop.name }}</title>
            </head>
            <body>
                {% if template == 'product' %}
                    {% island "product-card", props: { id: product.id }, hydrate: "eager" %}
                    {% endisland %}
                {% endif %}

                {% for item in collection.products %}
                    <div>{{ item.title }}</div>
                {% endfor %}
            </body>
            </html>
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });
});
