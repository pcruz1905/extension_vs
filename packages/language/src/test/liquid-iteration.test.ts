import { describe, test, expect, beforeAll } from 'vitest';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

describe('Liquid Iteration Tags', () => {
    let parse: (input: string) => Promise<LangiumDocument<Model>>;

    beforeAll(async () => {
        const services = createSellhubLiquidServices(EmptyFileSystem);
        parse = parseHelper<Model>(services.SellhubLiquid);
    });

    describe('for loop', () => {
        test('parse simple for loop', async () => {
            const document = await parse(`
                {% for product in collection.products %}
                    {{ product.title }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with else', async () => {
            const document = await parse(`
                {% for product in collection.products %}
                    {{ product.title }}
                {% else %}
                    The collection is empty.
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with limit parameter', async () => {
            const document = await parse(`
                {% for item in array limit:2 %}
                    {{ item }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with offset parameter', async () => {
            const document = await parse(`
                {% for item in array offset:2 %}
                    {{ item }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with offset:continue', async () => {
            const document = await parse(`
                {% for item in array limit:3 %}
                    {{ item }}
                {% endfor %}
                {% for item in array offset:continue %}
                    {{ item }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with range', async () => {
            const document = await parse(`
                {% for i in (1..5) %}
                    {{ i }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with variable range', async () => {
            const document = await parse(`
                {% assign num = 4 %}
                {% for i in (1..num) %}
                    {{ i }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with reversed parameter', async () => {
            const document = await parse(`
                {% for item in array reversed %}
                    {{ item }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with multiple parameters', async () => {
            const document = await parse(`
                {% for item in array limit:3 offset:2 reversed %}
                    {{ item }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with break', async () => {
            const document = await parse(`
                {% for i in (1..5) %}
                    {% if i == 4 %}
                        {% break %}
                    {% endif %}
                    {{ i }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop with continue', async () => {
            const document = await parse(`
                {% for i in (1..5) %}
                    {% if i == 4 %}
                        {% continue %}
                    {% endif %}
                    {{ i }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop using forloop.index', async () => {
            const document = await parse(`
                {% for product in products %}
                    {{ forloop.index }}: {{ product.title }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop using forloop.index0', async () => {
            const document = await parse(`
                {% for product in products %}
                    {{ forloop.index0 }}: {{ product.title }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop using forloop.first', async () => {
            const document = await parse(`
                {% for product in products %}
                    {% if forloop.first %}
                        First item: {{ product.title }}
                    {% endif %}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop using forloop.last', async () => {
            const document = await parse(`
                {% for product in products %}
                    {% if forloop.last %}
                        Last item: {{ product.title }}
                    {% endif %}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse for loop using forloop.length', async () => {
            const document = await parse(`
                {% for product in products %}
                    Item {{ forloop.index }} of {{ forloop.length }}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse nested for loops with forloop.parentloop', async () => {
            const document = await parse(`
                {% for product in products %}
                    {% for variant in product.variants %}
                        {{ forloop.parentloop.index }}.{{ forloop.index }}
                    {% endfor %}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('cycle', () => {
        test('parse simple cycle', async () => {
            const document = await parse(`
                {% cycle "one", "two", "three" %}
                {% cycle "one", "two", "three" %}
                {% cycle "one", "two", "three" %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse cycle with named group', async () => {
            const document = await parse(`
                {% cycle "group1": "one", "two", "three" %}
                {% cycle "group1": "one", "two", "three" %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse cycle in for loop', async () => {
            const document = await parse(`
                {% for product in products %}
                    <div class="{% cycle 'odd', 'even' %}">
                        {{ product.title }}
                    </div>
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('tablerow', () => {
        test('parse simple tablerow', async () => {
            const document = await parse(`
                <table>
                {% tablerow product in collection.products %}
                    {{ product.title }}
                {% endtablerow %}
                </table>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse tablerow with cols parameter', async () => {
            const document = await parse(`
                <table>
                {% tablerow product in collection.products cols:2 %}
                    {{ product.title }}
                {% endtablerow %}
                </table>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse tablerow with limit parameter', async () => {
            const document = await parse(`
                <table>
                {% tablerow product in collection.products limit:4 %}
                    {{ product.title }}
                {% endtablerow %}
                </table>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse tablerow with offset parameter', async () => {
            const document = await parse(`
                <table>
                {% tablerow product in collection.products offset:2 %}
                    {{ product.title }}
                {% endtablerow %}
                </table>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse tablerow with range', async () => {
            const document = await parse(`
                <table>
                {% tablerow i in (1..10) %}
                    {{ i }}
                {% endtablerow %}
                </table>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse tablerow with multiple parameters', async () => {
            const document = await parse(`
                <table>
                {% tablerow product in collection.products cols:3 limit:9 offset:3 %}
                    {{ product.title }}
                {% endtablerow %}
                </table>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse tablerow using tablerowloop properties', async () => {
            const document = await parse(`
                <table>
                {% tablerow product in products cols:3 %}
                    {{ tablerowloop.col }} - {{ tablerowloop.row }}
                {% endtablerow %}
                </table>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });
});
