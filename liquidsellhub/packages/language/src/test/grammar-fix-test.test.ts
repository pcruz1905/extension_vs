import { beforeAll, describe, expect, test } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import type { Model } from '../generated/ast.js';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';

let services: ReturnType<typeof createSellhubLiquidServices>;
let parse: ReturnType<typeof parseHelper<Model>>;

beforeAll(async () => {
    services = createSellhubLiquidServices(EmptyFileSystem);
    parse = parseHelper<Model>(services.SellhubLiquid);
});

describe('Grammar Fix Tests', () => {

    test('DEBUG: simple output with member access', async () => {
        const document = await parse(`{{ shop.id }}`);

        console.log('\n=== {{ shop.id }} ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('\nParser Errors:');
            document.parseResult.parserErrors.forEach((err, i) => {
                console.log(`  ${i + 1}.`, err.message);
            });
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('DEBUG: simple HTML', async () => {
        const document = await parse(`<html><body></body></html>`);

        console.log('\n=== Simple HTML ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('\nParser Errors:');
            document.parseResult.parserErrors.forEach((err, i) => {
                console.log(`  ${i + 1}.`, err.message);
            });
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('DEBUG: HTML with quoted attributes', async () => {
        const document = await parse(`<meta charset="utf-8" />`);

        console.log('\n=== HTML with quoted attributes ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('\nParser Errors:');
            document.parseResult.parserErrors.forEach((err, i) => {
                console.log(`  ${i + 1}.`, err.message);
            });
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });
});
