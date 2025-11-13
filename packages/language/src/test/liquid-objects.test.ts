import { describe, test, expect, beforeAll } from 'vitest';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

describe('Liquid Objects and Property Access', () => {
    let parse: (input: string) => Promise<LangiumDocument<Model>>;

    beforeAll(async () => {
        const services = createSellhubLiquidServices(EmptyFileSystem);
        parse = parseHelper<Model>(services.SellhubLiquid);
    });

    describe('simple property access', () => {
        test('parse single property', async () => {
            const document = await parse(`{{ product.title }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse nested property', async () => {
            const document = await parse(`{{ customer.name.first }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse deeply nested property', async () => {
            const document = await parse(`{{ shop.address.city.name }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('array access', () => {
        test('parse array index access', async () => {
            const document = await parse(`{{ product.images[0] }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse negative array index', async () => {
            const document = await parse(`{{ product.images[-1] }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse array index with variable', async () => {
            const document = await parse(`
                {% assign index = 2 %}
                {{ product.images[index] }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse array property access', async () => {
            const document = await parse(`{{ product.images[0].src }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('common Liquid objects', () => {
        test('parse product object', async () => {
            const document = await parse(`
                {{ product.title }}
                {{ product.price }}
                {{ product.available }}
                {{ product.description }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse collection object', async () => {
            const document = await parse(`
                {{ collection.title }}
                {{ collection.handle }}
                {{ collection.products }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse shop object', async () => {
            const document = await parse(`
                {{ shop.name }}
                {{ shop.email }}
                {{ shop.domain }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse customer object', async () => {
            const document = await parse(`
                {{ customer.name }}
                {{ customer.email }}
                {{ customer.orders }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse cart object', async () => {
            const document = await parse(`
                {{ cart.item_count }}
                {{ cart.total_price }}
                {{ cart.items }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse page object', async () => {
            const document = await parse(`
                {{ page.title }}
                {{ page.content }}
                {{ page.author }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse article object', async () => {
            const document = await parse(`
                {{ article.title }}
                {{ article.content }}
                {{ article.published_at }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('special objects', () => {
        test('parse forloop object', async () => {
            const document = await parse(`
                {% for product in products %}
                    {{ forloop.index }}
                    {{ forloop.index0 }}
                    {{ forloop.first }}
                    {{ forloop.last }}
                    {{ forloop.length }}
                {% endfor %}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse tablerowloop object', async () => {
            const document = await parse(`
                <table>
                {% tablerow product in products %}
                    {{ tablerowloop.col }}
                    {{ tablerowloop.row }}
                    {{ tablerowloop.index }}
                {% endtablerow %}
                </table>
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse all-products object', async () => {
            const document = await parse(`{{ all_products["product-handle"].title }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse collections object', async () => {
            const document = await parse(`{{ collections["sale"].title }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse pages object', async () => {
            const document = await parse(`{{ pages["about"].content }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('objects in conditions', () => {
        test('parse object in if condition', async () => {
            const document = await parse(`
                {% if product.available %}
                    In stock
                {% endif %}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse object comparison', async () => {
            const document = await parse(`
                {% if product.price > 100 %}
                    Premium
                {% endif %}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse object with logical operators', async () => {
            const document = await parse(`
                {% if product.available and product.price < 50 %}
                    Affordable and in stock
                {% endif %}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('objects in loops', () => {
        test('parse object in for loop', async () => {
            const document = await parse(`
                {% for product in collection.products %}
                    {{ product.title }}
                {% endfor %}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse nested object iteration', async () => {
            const document = await parse(`
                {% for product in collection.products %}
                    {% for variant in product.variants %}
                        {{ variant.title }}
                    {% endfor %}
                {% endfor %}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('objects with filters', () => {
        test('parse object with filter', async () => {
            const document = await parse(`{{ product.title | upcase }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse object property with filter chain', async () => {
            const document = await parse(`{{ product.title | upcase | truncate: 20 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse nested property with filters', async () => {
            const document = await parse(`{{ customer.name.first | upcase }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse array access with filters', async () => {
            const document = await parse(`{{ product.images[0].src | img_url: 'large' }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('string indexing', () => {
        test('parse string key access', async () => {
            const document = await parse(`{{ product["title"] }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse variable string key', async () => {
            const document = await parse(`
                {% assign key = "title" %}
                {{ product[key] }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse collections with string key', async () => {
            const document = await parse(`{{ collections["frontpage"].products }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });
});
