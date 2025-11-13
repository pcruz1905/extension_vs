import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, FileSystemProvider } from "langium";
import { parseHelper } from "langium/test";
import { createSellhubLiquidServices } from "../sellhub-liquid-module.js";
import { Model, isIslandTag } from "../generated/ast.js";
import * as fs from 'fs';
import * as path from 'path';

let services: ReturnType<typeof createSellhubLiquidServices>;
let parse: ReturnType<typeof parseHelper<Model>>;

const SAMPLE_THEME_PATH = path.resolve(__dirname, '../../../../../../backend/testtheme/themes/sample-theme');

beforeAll(async () => {
    services = createSellhubLiquidServices(EmptyFileSystem);
    parse = parseHelper<Model>(services.SellhubLiquid);
});

// Helper to check if sample theme exists
function sampleThemeExists(): boolean {
    try {
        return fs.existsSync(SAMPLE_THEME_PATH);
    } catch {
        return false;
    }
}

// Helper to read file content
function readSampleFile(relativePath: string): string {
    const fullPath = path.join(SAMPLE_THEME_PATH, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
}

describe('Sample Theme Integration Tests', () => {

    test.skipIf(!sampleThemeExists())('parse footer.liquid from sample theme', async () => {
        const content = readSampleFile('layouts/footer.liquid');
        const document = await parse(content);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        // Check that Islands tags are extracted
        const islands = document.parseResult.value.elements.filter(isIslandTag);
        expect(islands.length).toBeGreaterThan(0);

        // Verify site-footer island exists
        const siteFooter = islands.find(island =>
            isIslandTag(island) && island.name.includes('site-footer')
        );
        expect(siteFooter).toBeDefined();
    });

    test.skipIf(!sampleThemeExists())('parse collection.liquid from sample theme', async () => {
        const content = readSampleFile('templates/collection.liquid');
        const document = await parse(content);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        // Check that Islands tags are extracted
        const islands = document.parseResult.value.elements.filter(isIslandTag);
        expect(islands.length).toBeGreaterThan(0);

        // Verify price-display and cart-counter islands exist
        const componentNames = islands
            .filter(isIslandTag)
            .map(island => island.name);

        expect(componentNames.some(name => name.includes('price-display'))).toBe(true);
        expect(componentNames.some(name => name.includes('cart-counter'))).toBe(true);
    });

    test.skipIf(!sampleThemeExists())('parse product.liquid from sample theme', async () => {
        const content = readSampleFile('templates/product.liquid');
        const document = await parse(content);

        expect(document.parseResult.parserErrors).toHaveLength(0);

        // Check that Islands tags are extracted
        const islands = document.parseResult.value.elements.filter(isIslandTag);
        expect(islands.length).toBeGreaterThan(0);

        // Verify hydration strategies
        const eagerIslands = islands.filter(island =>
            isIslandTag(island) && island.hydrate?.includes('eager')
        );
        expect(eagerIslands.length).toBeGreaterThan(0);
    });

    test.skipIf(!sampleThemeExists())('parse layout.liquid from sample theme', async () => {
        const content = readSampleFile('layouts/layout.liquid');
        const document = await parse(content);

        // Should parse without errors even though it has complex Liquid output
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test.skipIf(!sampleThemeExists())('parse header.liquid from sample theme', async () => {
        const content = readSampleFile('layouts/header.liquid');
        const document = await parse(content);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test.skipIf(!sampleThemeExists())('parse all .liquid files in sample theme', async () => {
        const errors: Array<{ file: string; errors: string[] }> = [];

        async function walkDirectory(dir: string): Promise<void> {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    await walkDirectory(fullPath);
                } else if (file.endsWith('.liquid')) {
                    const relativePath = path.relative(SAMPLE_THEME_PATH, fullPath);
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        const document = await parse(content);

                        if (document.parseResult.parserErrors.length > 0) {
                            errors.push({
                                file: relativePath,
                                errors: document.parseResult.parserErrors.map(e => e.message)
                            });
                        }
                    } catch (error) {
                        errors.push({
                            file: relativePath,
                            errors: [error instanceof Error ? error.message : String(error)]
                        });
                    }
                }
            }
        }

        await walkDirectory(SAMPLE_THEME_PATH);

        // Report all errors if any
        if (errors.length > 0) {
            const errorReport = errors
                .map(({ file, errors }) => `\n${file}:\n  ${errors.join('\n  ')}`)
                .join('\n');

            expect.fail(`Parser errors in sample theme files:${errorReport}`);
        }
    });
});

describe('Sample Theme Islands Extraction', () => {

    test.skipIf(!sampleThemeExists())('extract all islands from sample theme', async () => {
        const allIslands: Array<{ file: string; componentName: string; hasProps: boolean; hydrate?: string }> = [];

        async function walkDirectory(dir: string): Promise<void> {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    await walkDirectory(fullPath);
                } else if (file.endsWith('.liquid')) {
                    const relativePath = path.relative(SAMPLE_THEME_PATH, fullPath);
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const document = await parse(content);

                    const islands = document.parseResult.value.elements.filter(isIslandTag);

                    for (const island of islands) {
                        if (isIslandTag(island)) {
                            allIslands.push({
                                file: relativePath,
                                componentName: island.name,
                                hasProps: !!island.props,
                                hydrate: island.hydrate?.replace(/['"]/g, '')
                            });
                        }
                    }
                }
            }
        }

        await walkDirectory(SAMPLE_THEME_PATH);

        // Log all found islands for debugging
        console.log('\nIslands found in sample theme:');
        allIslands.forEach(island => {
            console.log(`  ${island.file}: ${island.componentName} (props: ${island.hasProps}, hydrate: ${island.hydrate || 'none'})`);
        });

        // Should find at least the islands we know exist
        expect(allIslands.length).toBeGreaterThan(0);

        // Check for known components
        const componentNames = allIslands.map(i => i.componentName);
        expect(componentNames.some(name => name.includes('site-footer'))).toBe(true);
        expect(componentNames.some(name => name.includes('price-display'))).toBe(true);
        expect(componentNames.some(name => name.includes('cart-counter'))).toBe(true);
    });
});
