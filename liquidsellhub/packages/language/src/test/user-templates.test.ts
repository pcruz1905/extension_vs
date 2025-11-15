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

describe('User-Provided Templates', () => {

    test('Header template with member access and styles', async () => {
        const document = await parse(`
<header style="background:#1a202c;color:#fff;padding:0;position:sticky;top:0;z-index:1000;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
  <div style="background:#2d3748;padding:8px 0;font-size:0.875rem;text-align:center;">
    <div style="max-width:1200px;margin:0 auto;padding:0 1rem;">
      <span>Free shipping on orders over $50</span>
    </div>
  </div>

  <div style="max-width:1200px;margin:0 auto;padding:1rem 1.5rem;">
    <div style="flex-shrink:0;">
      <a href="/?shop={{ shop.id }}" style="color:#fff;">
        <span style="background:linear-gradient(135deg,#667eea,#764ba2);">{{ shop.name | slice: 0, 1 }}</span>
        {{ shop.name }}
      </a>
    </div>
  </div>
</header>
        `);

        console.log('\n=== Header Template ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('\nParser Errors:');
            document.parseResult.parserErrors.forEach((err, i) => {
                console.log(`  ${i + 1}.`, err.message.substring(0, 100));
            });
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('Layout template with DOCTYPE', async () => {
        const document = await parse(`
<!doctype html>
<html lang="{{ shop.locale | default: 'en' }}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{{ page_title | default: shop.name }}</title>
</head>
<body>
  {{ header }}
  <main>{{ content }}</main>
  {{ footer }}
</body>
</html>
        `);

        console.log('\n=== Layout Template ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('\nParser Errors:');
            document.parseResult.parserErrors.forEach((err, i) => {
                console.log(`  ${i + 1}.`, err.message.substring(0, 100));
            });
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('Footer template with island', async () => {
        const document = await parse(`
<footer style="background:#1a202c;color:#a0aec0;padding:4rem 2rem 2rem;">
  <div style="max-width:1200px;margin:0 auto;">
    {% island "site-footer", props: { shopName: shop.name, year: "2025" }, hydrate: "lazy" %}
    {% endisland %}
  </div>
</footer>
        `);

        console.log('\n=== Footer Template ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('\nParser Errors:');
            document.parseResult.parserErrors.forEach((err, i) => {
                console.log(`  ${i + 1}.`, err.message.substring(0, 100));
            });
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('Collection page template', async () => {
        const document = await parse(`
<div class="container">
  <header class="collection-header">
    <h1 class="collection-title">{{ collection.title }}</h1>
    {% if collection.description %}
      <p class="collection-description">{{ collection.description }}</p>
    {% endif %}
  </header>

  <div class="products-grid">
    {% for product in collection.products %}
      <article class="product-card">
        <a href="/products/{{ product.handle }}?shop={{ shop.id }}">
          {% if product.imageUrl %}
            <img src="{{ product.imageUrl }}" alt="{{ product.title }}" class="product-image" />
          {% endif %}
          <h2 class="product-title">{{ product.title }}</h2>
        </a>

        {% if product.description %}
          <p>{{ product.description }}</p>
        {% endif %}

        {% island "price-display", props: { amount: product.price, currency: "USD", compareAtPrice: product.compareAtPrice }, hydrate: "lazy" %}
        {% endisland %}

        {% island "cart-counter", props: { productId: product.id, productTitle: product.title, count: 0 }, hydrate: "lazy" %}
        {% endisland %}
      </article>
    {% endfor %}
  </div>
</div>
        `);

        console.log('\n=== Collection Page Template ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('\nParser Errors:');
            document.parseResult.parserErrors.forEach((err, i) => {
                console.log(`  ${i + 1}.`, err.message.substring(0, 100));
            });
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
    });
});
