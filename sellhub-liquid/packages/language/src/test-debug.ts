import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from './sellhub-liquid-module.js';
import type { Model } from './generated/ast.js';

const services = createSellhubLiquidServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.SellhubLiquid);

// Test filter with named arguments
const input = `{{ product | image_url: width: 100, height: 200 }}`;
console.log('Input:', input);

// Check tokens
const lexer = services.SellhubLiquid.parser.Lexer;
const tokens = lexer.tokenize(input);
console.log('\nTokens:');
tokens.tokens.forEach((tok, i) => {
    console.log(`  ${i}: ${tok.tokenType.name} = "${tok.image}" (offset: ${tok.startOffset})`);
});

const document = await parse(input);

console.log('\n' + '='.repeat(50));
console.log('Parser Errors:', document.parseResult.parserErrors.length);
if (document.parseResult.parserErrors.length > 0) {
    document.parseResult.parserErrors.forEach((err, i) => {
        console.log(`\nError ${i + 1}:`);
        console.log('Message:', err.message);
        console.log('Token:', err.token?.text);
    });
}

console.log('\nElements count:', document.parseResult.value.elements?.length || 0);
console.log('Success:', document.parseResult.parserErrors.length === 0 ? 'YES' : 'NO');
