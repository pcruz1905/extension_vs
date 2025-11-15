import { beforeAll, describe, expect, test } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import type { Model } from '../generated/ast.js';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';

/**
 * System Integration Tests
 *
 * These tests simulate complete end-to-end scenarios with full templates,
 * testing the entire parsing and validation pipeline.
 */

let services: ReturnType<typeof createSellhubLiquidServices>;
let parse: ReturnType<typeof parseHelper<Model>>;

beforeAll(async () => {
    services = createSellhubLiquidServices(EmptyFileSystem);
    parse = parseHelper<Model>(services.SellhubLiquid);
});

describe('System Integration Tests', () => {

    test('SYSTEM: Complete collection page with Islands and loops', async () => {
        const document = await parse(`
<html>
<head>
  <title>{{ collection.title }} - {{ shop.name }}</title>
</head>
<body>
  <header>
    <nav>
      <a href=/?shop={{ shop.id }}>{{ shop.name }}</a>
      <a href=/collections?shop={{ shop.id }}>Collections</a>
      <a href=/cart?shop={{ shop.id }}>Cart: {{ cart.item_count }}</a>
    </nav>
  </header>

  <main>
    <h1>{{ collection.title }}</h1>

    {% if collection.description %}
      <p>{{ collection.description }}</p>
    {% endif %}

    <div>
      {% for product in collection.products %}
        <article>
          <a href=/products/{{ product.handle }}?shop={{ shop.id }}>
            {% if product.imageUrl %}
              <img src={{ product.imageUrl }} alt={{ product.title }} />
            {% endif %}

            <h2>{{ product.title }}</h2>
          </a>

          {% if product.description %}
            <p>{{ product.description }}</p>
          {% endif %}

          {% if product.available %}
            {% island "price-display", props: {
              amount: product.price,
              currency: shop.currency,
              compareAtPrice: product.compareAtPrice
            }, hydrate: "lazy" %}
            {% endisland %}

            {% island "cart-counter", props: {
              productId: product.id,
              productTitle: product.title,
              count: 0
            }, hydrate: "lazy" %}
            {% endisland %}
          {% else %}
            <p>Out of Stock</p>
          {% endif %}
        </article>
      {% endfor %}
    </div>
  </main>

  <footer>
    {% island "site-footer", props: {
      shopName: shop.name,
      year: 2025
    }, hydrate: "lazy" %}
    {% endisland %}
  </footer>
</body>
</html>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        expect(model).toBeDefined();
        expect(model.elements.length).toBeGreaterThan(0);

        // Verify complex nested structures
        const findElements = (elements: any[], type: string): any[] => {
            let found: any[] = [];
            for (const el of elements) {
                if (el.$type === type) {
                    found.push(el);
                }
                if (el.content && Array.isArray(el.content)) {
                    found = found.concat(findElements(el.content, type));
                }
                if (el.elseContent && Array.isArray(el.elseContent)) {
                    found = found.concat(findElements(el.elseContent, type));
                }
            }
            return found;
        };

        const forTags = findElements(model.elements, 'ForTag');
        const ifTags = findElements(model.elements, 'IfTag');
        const islands = findElements(model.elements, 'IslandTag');

        expect(forTags.length).toBeGreaterThanOrEqual(1);
        expect(ifTags.length).toBeGreaterThanOrEqual(2);
        expect(islands.length).toBeGreaterThanOrEqual(3);

        console.log('\nSystem Test Results:');
        console.log(`  - For loops: ${forTags.length}`);
        console.log(`  - If conditions: ${ifTags.length}`);
        console.log(`  - Islands: ${islands.length}`);
    });

    test('SYSTEM: Product page with multiple islands', async () => {
        const document = await parse(`
<html>
<head>
  <title>{{ product.title }} - {{ shop.name }}</title>
</head>
<body>
  <main>
    <div>
      <h1>{{ product.title }}</h1>

      {% if product.vendor %}
        <p>by {{ product.vendor }}</p>
      {% endif %}

      {% island "price-display", props: {
        amount: product.price,
        currency: shop.currency,
        compareAtPrice: product.compareAtPrice
      }, hydrate: "eager" %}
      {% endisland %}

      {% island "cart-counter", props: {
        productId: product.id,
        productTitle: product.title,
        count: 0
      }, hydrate: "lazy" %}
      {% endisland %}

      <div>
        {{ product.description }}
      </div>
    </div>
  </main>
</body>
</html>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        expect(model).toBeDefined();
    });

    test('SYSTEM: Performance check - 50 products with 100 islands', async () => {
        const startTime = Date.now();

        // Generate a large template with many products and islands
        let template = '<div>';

        for (let i = 0; i < 50; i++) {
            template += `
              <div>
                <h2>Product ${i}</h2>
                {% island "price-display", props: { amount: ${i * 100}, currency: shop.currency }, hydrate: "lazy" %}
                {% endisland %}
                {% island "cart-counter", props: { productId: ${i}, productTitle: product.title, count: 0 }, hydrate: "lazy" %}
                {% endisland %}
              </div>
            `;
        }

        template += '</div>';

        const document = await parse(template);
        const parseTime = Date.now() - startTime;

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        console.log(`\nPerformance Test:`);
        console.log(`  - Parsed 50 products with 100 islands: ${parseTime}ms`);
        console.log(`  - Average per island: ${(parseTime / 100).toFixed(2)}ms`);

        // Should parse reasonably fast (under 5 seconds for 100 islands)
        expect(parseTime).toBeLessThan(5000);
    });
});
