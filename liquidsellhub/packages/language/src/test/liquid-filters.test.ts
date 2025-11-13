import { describe, test, expect, beforeAll } from 'vitest';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

describe('Liquid Filters', () => {
    let parse: (input: string) => Promise<LangiumDocument<Model>>;

    beforeAll(async () => {
        const services = createSellhubLiquidServices(EmptyFileSystem);
        parse = parseHelper<Model>(services.SellhubLiquid);
    });

    describe('string filters', () => {
        test('parse upcase filter', async () => {
            const document = await parse(`{{ "hello" | upcase }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse downcase filter', async () => {
            const document = await parse(`{{ "HELLO" | downcase }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse capitalize filter', async () => {
            const document = await parse(`{{ "hello world" | capitalize }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse append filter', async () => {
            const document = await parse(`{{ "file" | append: ".txt" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse prepend filter', async () => {
            const document = await parse(`{{ "World" | prepend: "Hello " }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse remove filter', async () => {
            const document = await parse(`{{ "Hello World" | remove: "World" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse replace filter', async () => {
            const document = await parse(`{{ "Hello World" | replace: "World", "Liquid" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse split filter', async () => {
            const document = await parse(`{{ "a,b,c" | split: "," }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse strip filter', async () => {
            const document = await parse(`{{ "  hello  " | strip }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse strip_html filter', async () => {
            const document = await parse(`{{ "<p>Hello</p>" | strip_html }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse strip_newlines filter', async () => {
            const document = await parse(`{{ "Hello\nWorld" | strip_newlines }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse truncate filter', async () => {
            const document = await parse(`{{ "Hello Liquid" | truncate: 5 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse truncatewords filter', async () => {
            const document = await parse(`{{ "Hello wonderful Liquid world" | truncatewords: 2 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse escape filter', async () => {
            const document = await parse(`{{ "<p>test</p>" | escape }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse escape_once filter', async () => {
            const document = await parse(`{{ "&lt;p&gt;" | escape_once }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse newline_to_br filter', async () => {
            const document = await parse(`{{ "Hello\nWorld" | newline_to_br }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('math filters', () => {
        test('parse abs filter', async () => {
            const document = await parse(`{{ -5 | abs }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse ceil filter', async () => {
            const document = await parse(`{{ 4.3 | ceil }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse floor filter', async () => {
            const document = await parse(`{{ 4.7 | floor }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse round filter', async () => {
            const document = await parse(`{{ 4.5 | round }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse plus filter', async () => {
            const document = await parse(`{{ 5 | plus: 3 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse minus filter', async () => {
            const document = await parse(`{{ 10 | minus: 3 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse times filter', async () => {
            const document = await parse(`{{ 5 | times: 3 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse divided_by filter', async () => {
            const document = await parse(`{{ 10 | divided_by: 2 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse modulo filter', async () => {
            const document = await parse(`{{ 10 | modulo: 3 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse at_least filter', async () => {
            const document = await parse(`{{ 5 | at_least: 10 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse at_most filter', async () => {
            const document = await parse(`{{ 15 | at_most: 10 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('array filters', () => {
        test('parse first filter', async () => {
            const document = await parse(`{{ collection.products | first }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse last filter', async () => {
            const document = await parse(`{{ collection.products | last }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse join filter', async () => {
            const document = await parse(`{{ product.tags | join: ", " }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse sort filter', async () => {
            const document = await parse(`{{ collection.products | sort: "price" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse sort_natural filter', async () => {
            const document = await parse(`{{ collection.products | sort_natural: "title" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse reverse filter', async () => {
            const document = await parse(`{{ collection.products | reverse }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse uniq filter', async () => {
            const document = await parse(`{{ product.tags | uniq }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse compact filter', async () => {
            const document = await parse(`{{ collection.products | compact }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse map filter', async () => {
            const document = await parse(`{{ collection.products | map: "title" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse where filter', async () => {
            const document = await parse(`{{ collection.products | where: "available", true }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse size filter', async () => {
            const document = await parse(`{{ collection.products | size }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse concat filter', async () => {
            const document = await parse(`{{ collection1.products | concat: collection2.products }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse slice filter', async () => {
            const document = await parse(`{{ product.tags | slice: 0, 3 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('other filters', () => {
        test('parse default filter', async () => {
            const document = await parse(`{{ user.name | default: "Guest" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse date filter', async () => {
            const document = await parse(`{{ article.published_at | date: "%Y-%m-%d" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse url_encode filter', async () => {
            const document = await parse(`{{ "Hello World" | url_encode }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse url_decode filter', async () => {
            const document = await parse(`{{ "Hello%20World" | url_decode }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('filter chains', () => {
        test('parse two filters chained', async () => {
            const document = await parse(`{{ "hello" | upcase | append: " WORLD" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse three filters chained', async () => {
            const document = await parse(`{{ "hello world" | upcase | truncate: 8 | append: "!" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse filter chain with array', async () => {
            const document = await parse(`{{ collection.products | map: "title" | join: ", " }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse filter chain with math', async () => {
            const document = await parse(`{{ product.price | times: 1.15 | round: 2 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse complex filter chain', async () => {
            const document = await parse(`{{ product.title | downcase | replace: " ", "-" | append: ".html" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('filters with multiple parameters', () => {
        test('parse replace with two parameters', async () => {
            const document = await parse(`{{ "Hello World" | replace: "World", "Liquid" }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse slice with two parameters', async () => {
            const document = await parse(`{{ array | slice: 0, 5 }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse where with two parameters', async () => {
            const document = await parse(`{{ products | where: "available", true }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse truncate with custom ellipsis', async () => {
            const document = await parse(`{{ "Hello World" | truncate: 7, "..." }}`);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('filters in assignments', () => {
        test('parse filter in assign', async () => {
            const document = await parse(`
                {% assign upper_title = product.title | upcase %}
                {{ upper_title }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse filter chain in assign', async () => {
            const document = await parse(`
                {% assign formatted = product.title | downcase | truncate: 20 %}
                {{ formatted }}
            `);
            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });
});
