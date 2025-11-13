import { describe, expect, test } from 'vitest';
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const services = createSellhubLiquidServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.SellhubLiquid);

describe('Full Homepage Template', () => {
    test('parse complete homepage with all sections', async () => {
        // Read from fixture file to avoid JavaScript template literal conflicts with ${{
        const homepage = readFileSync(join(__dirname, 'fixtures', 'homepage.liquid'), 'utf-8');

        const document = await parse(homepage);

        console.log('=== Full Homepage ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.lexerErrors.length > 0) {
            console.log('Lexer errors:', document.parseResult.lexerErrors.map(e => e.message));
        }
        if (document.parseResult.parserErrors.length > 0) {
            console.log('Parser errors:', document.parseResult.parserErrors.map(e => e.message));
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });
});
