import { describe, test, expect, beforeAll } from 'vitest';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

describe('Liquid Control Flow Tags', () => {
    let parse: (input: string) => Promise<LangiumDocument<Model>>;

    beforeAll(async () => {
        const services = createSellhubLiquidServices(EmptyFileSystem);
        parse = parseHelper<Model>(services.SellhubLiquid);
    });

    describe('if/elsif/else', () => {
        test('parse simple if statement', async () => {
            const document = await parse(`
                {% if customer %}
                    Hello {{ customer.name }}
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with elsif', async () => {
            const document = await parse(`
                {% if customer.name == "kevin" %}
                    Hey Kevin!
                {% elsif customer.name == "anonymous" %}
                    Hey Anonymous!
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with elsif and else', async () => {
            const document = await parse(`
                {% if customer.name == "kevin" %}
                    Hey Kevin!
                {% elsif customer.name == "anonymous" %}
                    Hey Anonymous!
                {% else %}
                    Hi Stranger!
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with equality operator', async () => {
            const document = await parse(`
                {% if product.title == "Awesome Shoes" %}
                    These shoes are awesome!
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with inequality operator', async () => {
            const document = await parse(`
                {% if product.title != "Awesome Shoes" %}
                    These shoes are not awesome.
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with greater than operator', async () => {
            const document = await parse(`
                {% if product.price > 100 %}
                    Expensive product
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with less than operator', async () => {
            const document = await parse(`
                {% if product.price < 50 %}
                    Cheap product
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with greater than or equal operator', async () => {
            const document = await parse(`
                {% if product.price >= 100 %}
                    Premium product
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with less than or equal operator', async () => {
            const document = await parse(`
                {% if product.price <= 50 %}
                    Budget product
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with and operator', async () => {
            const document = await parse(`
                {% if product.available and product.price < 100 %}
                    Available and affordable
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with or operator', async () => {
            const document = await parse(`
                {% if product.title == "Shirt" or product.title == "Pants" %}
                    Clothing item
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse if with contains operator', async () => {
            const document = await parse(`
                {% if product.title contains "Pack" %}
                    This is a pack
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse nested if statements', async () => {
            const document = await parse(`
                {% if customer %}
                    {% if customer.name == "kevin" %}
                        Hey Kevin!
                    {% endif %}
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('unless', () => {
        test('parse simple unless statement', async () => {
            const document = await parse(`
                {% unless product.title == "Awesome Shoes" %}
                    These shoes are not awesome.
                {% endunless %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse unless with else', async () => {
            const document = await parse(`
                {% unless product.available %}
                    Sold out
                {% else %}
                    Available
                {% endunless %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse unless with complex condition', async () => {
            const document = await parse(`
                {% unless product.price > 100 and product.available %}
                    Not premium or not available
                {% endunless %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('case/when', () => {
        test('parse simple case statement', async () => {
            const document = await parse(`
                {% assign handle = "cake" %}
                {% case handle %}
                    {% when "cake" %}
                        This is a cake
                    {% endcase %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse case with multiple when clauses', async () => {
            const document = await parse(`
                {% assign handle = "cookie" %}
                {% case handle %}
                    {% when "cake" %}
                        This is a cake
                    {% when "cookie" %}
                        This is a cookie
                    {% when "biscuit" %}
                        This is a biscuit
                    {% endcase %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse case with multiple values in when', async () => {
            const document = await parse(`
                {% case handle %}
                    {% when "cake" %}
                        This is a cake
                    {% when "cookie", "biscuit" %}
                        This is a cookie or biscuit
                    {% endcase %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse case with else clause', async () => {
            const document = await parse(`
                {% case handle %}
                    {% when "cake" %}
                        This is a cake
                    {% when "cookie" %}
                        This is a cookie
                    {% else %}
                        Not cake nor cookie
                    {% endcase %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });
});
