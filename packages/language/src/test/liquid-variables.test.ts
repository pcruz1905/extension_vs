import { describe, test, expect, beforeAll } from 'vitest';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

describe('Liquid Variable Tags', () => {
    let parse: (input: string) => Promise<LangiumDocument<Model>>;

    beforeAll(async () => {
        const services = createSellhubLiquidServices(EmptyFileSystem);
        parse = parseHelper<Model>(services.SellhubLiquid);
    });

    describe('assign', () => {
        test('parse assign with string value', async () => {
            const document = await parse(`
                {% assign foo = "bar" %}
                {{ foo }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse assign with number value', async () => {
            const document = await parse(`
                {% assign count = 10 %}
                {{ count }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse assign with boolean value', async () => {
            const document = await parse(`
                {% assign my_variable = false %}
                {% if my_variable != true %}
                    This statement is valid.
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse assign with variable reference', async () => {
            const document = await parse(`
                {% assign my_variable = product.title %}
                {{ my_variable }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse assign with filter', async () => {
            const document = await parse(`
                {% assign my_upcase_string = "Hello world" | upcase %}
                {{ my_upcase_string }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse assign with multiple filters', async () => {
            const document = await parse(`
                {% assign my_string = "Hello" | upcase | append: " WORLD" %}
                {{ my_string }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse assign with expression', async () => {
            const document = await parse(`
                {% assign total = price | times: quantity %}
                {{ total }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('capture', () => {
        test('parse simple capture', async () => {
            const document = await parse(`
                {% capture my_variable %}
                I am being captured.
                {% endcapture %}
                {{ my_variable }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse capture with variables', async () => {
            const document = await parse(`
                {% assign favorite_food = "pizza" %}
                {% assign age = 35 %}
                {% capture about_me %}
                I am {{ age }} and my favorite food is {{ favorite_food }}.
                {% endcapture %}
                {{ about_me }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse capture with filters', async () => {
            const document = await parse(`
                {% capture my_var %}
                {{ "hello" | upcase }}
                {% endcapture %}
                {{ my_var }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse capture with tags', async () => {
            const document = await parse(`
                {% capture product_list %}
                {% for product in products %}
                    {{ product.title }}
                {% endfor %}
                {% endcapture %}
                {{ product_list }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('increment', () => {
        test('parse simple increment', async () => {
            const document = await parse(`
                {% increment my_counter %}
                {% increment my_counter %}
                {% increment my_counter %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse increment with different variables', async () => {
            const document = await parse(`
                {% increment counter1 %}
                {% increment counter2 %}
                {% increment counter1 %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse increment in for loop', async () => {
            const document = await parse(`
                {% for product in products %}
                    {% increment loop_counter %}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('decrement', () => {
        test('parse simple decrement', async () => {
            const document = await parse(`
                {% decrement variable %}
                {% decrement variable %}
                {% decrement variable %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse decrement with different variables', async () => {
            const document = await parse(`
                {% decrement counter1 %}
                {% decrement counter2 %}
                {% decrement counter1 %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse decrement in for loop', async () => {
            const document = await parse(`
                {% for product in products %}
                    {% decrement countdown %}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('variable scope and independence', () => {
        test('parse increment and assign are independent', async () => {
            const document = await parse(`
                {% assign var = 10 %}
                {% increment var %}
                {% increment var %}
                {{ var }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse decrement and assign are independent', async () => {
            const document = await parse(`
                {% assign var = 10 %}
                {% decrement var %}
                {% decrement var %}
                {{ var }}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });
});
