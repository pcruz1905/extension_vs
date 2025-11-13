import { describe, test, expect, beforeAll } from 'vitest';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

describe('Liquid Template Tags', () => {
    let parse: (input: string) => Promise<LangiumDocument<Model>>;

    beforeAll(async () => {
        const services = createSellhubLiquidServices(EmptyFileSystem);
        parse = parseHelper<Model>(services.SellhubLiquid);
    });

    describe('comment', () => {
        test('parse block comment', async () => {
            const document = await parse(`
                {% comment %}
                This is a comment
                {% endcomment %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse inline comment', async () => {
            const document = await parse(`
                {% # This is an inline comment %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse multi-line inline comment', async () => {
            const document = await parse(`
                {%
                    # This is a multi-line
                    # inline comment
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse comment with liquid code inside', async () => {
            const document = await parse(`
                {% comment %}
                {% if product.available %}
                    This won't render
                {% endif %}
                {% endcomment %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('raw', () => {
        test('parse simple raw block', async () => {
            const document = await parse(`
                {% raw %}
                {{ this will not be processed }}
                {% endraw %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse raw with Liquid syntax', async () => {
            const document = await parse(`
                {% raw %}
                {% if product %}
                    {{ product.title }}
                {% endif %}
                {% endraw %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse raw with Mustache syntax', async () => {
            const document = await parse(`
                {% raw %}
                {{ mustache.variable }}
                {{#each items}}
                    {{name}}
                {{/each}}
                {% endraw %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('liquid tag (inline)', () => {
        test('parse liquid tag with single statement', async () => {
            const document = await parse(`
                {% liquid
                    assign topic = 'Hello'
                    echo topic
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse liquid tag with multiple statements', async () => {
            const document = await parse(`
                {% liquid
                    assign username = "admin"
                    assign message = "Welcome"
                    echo message
                    echo username
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse liquid tag with if statement', async () => {
            const document = await parse(`
                {% liquid
                    if product.available
                        echo "Available"
                    else
                        echo "Sold out"
                    endif
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse liquid tag with for loop', async () => {
            const document = await parse(`
                {% liquid
                    for product in collection.products
                        echo product.title
                        echo product.price | money
                    endfor
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse liquid tag with case statement', async () => {
            const document = await parse(`
                {% liquid
                    case section.id
                        when 'template'
                            assign variable = 'foo'
                        when 'section'
                            assign variable = 'bar'
                    endcase
                    echo variable
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('echo', () => {
        test('parse echo in liquid tag', async () => {
            const document = await parse(`
                {% liquid
                    echo "Hello World"
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse echo with variable', async () => {
            const document = await parse(`
                {% liquid
                    assign greeting = "Hello"
                    echo greeting
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse echo with filter', async () => {
            const document = await parse(`
                {% liquid
                    echo "hello" | upcase
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse echo with multiple filters', async () => {
            const document = await parse(`
                {% liquid
                    echo product.title | upcase | truncate: 20
                %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('render', () => {
        test('parse simple render', async () => {
            const document = await parse(`
                {% render "product-card" %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse render with single quotes', async () => {
            const document = await parse(`
                {% render 'product-card' %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse render with variable', async () => {
            const document = await parse(`
                {% render "product", product: featured_product %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse render with multiple variables', async () => {
            const document = await parse(`
                {% render "product-card", product: product, show_vendor: true %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse render with as keyword', async () => {
            const document = await parse(`
                {% render "product" with featured_product as product %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse render with for keyword', async () => {
            const document = await parse(`
                {% render "variant" for variants as variant %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse render with filter', async () => {
            const document = await parse(`
                {% render "price", price: product.price | money %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('include (deprecated)', () => {
        test('parse simple include', async () => {
            const document = await parse(`
                {% include "product-card" %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse include with variable', async () => {
            const document = await parse(`
                {% include "product", product: featured_product %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse include with with keyword', async () => {
            const document = await parse(`
                {% include "product" with featured_product %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse include with for keyword', async () => {
            const document = await parse(`
                {% include "variant" for variants %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });
});
