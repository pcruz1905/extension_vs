import { beforeAll, describe, expect, test } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import type { Model } from '../generated/ast.js';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';

/**
 * Tests for complete theme templates with Islands
 *
 * NOTE: The current Liquid grammar has limitations with HTML attributes that use quoted strings.
 * STRING terminals are matched before TEXT_CONTENT, which causes parser errors when quotes appear
 * in HTML attributes. These tests focus on testing the Islands functionality and Liquid features
 * rather than perfect HTML5 syntax support.
 *
 * Known limitation: HTML like <meta charset="utf-8" /> will cause parser errors.
 * Workaround: Simplified HTML without quoted attributes where possible, or omitting attributes.
 */

let services: ReturnType<typeof createSellhubLiquidServices>;
let parse: ReturnType<typeof parseHelper<Model>>;

beforeAll(async () => {
    services = createSellhubLiquidServices(EmptyFileSystem);
    parse = parseHelper<Model>(services.SellhubLiquid);
});

describe('Complete Theme Templates with Islands', () => {

    test('parse layout template with header and footer placeholders', async () => {
        const document = await parse(`
<html>
<head>
  <title>{{ page_title }}</title>
</head>
<body>
  {{ header }}

  <main>
    {{ content }}
  </main>

  {{ footer }}
</body>
</html>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        // Check that the template contains output statements
        const model = document.parseResult.value;
        expect(model).toBeDefined();
    });

    test('parse header template with navigation', async () => {
        const document = await parse(`
<header>
  <div>
    <div>
      <span>Free shipping on orders over $50</span>
    </div>
  </div>

  <div>
    <div>
      <a href=/?shop={{ shop.id }}>
        <span>{{ shop.name | slice: 0, 1 }}</span>
        {{ shop.name }}
      </a>
    </div>

    <nav>
      <a href=/?shop={{ shop.id }}>Home</a>
      <div>
        <a href=/collections/summer?shop={{ shop.id }}>Collections</a>
      </div>
      <a href=/about?shop={{ shop.id }}>About</a>
      <a href=/contact?shop={{ shop.id }}>Contact</a>
    </nav>

    <div>
      <a href=#>Search</a>
      <a href=#>Cart: <span>{{ cart.item_count }}</span></a>
      <a href=#>Account</a>
    </div>
  </div>
</header>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        expect(model).toBeDefined();

        // Verify we can parse filters in navigation
        const elements = model.elements;
        expect(elements).toBeDefined();
    });

    test('parse footer template with site-footer island', async () => {
        const document = await parse(`
<footer>
  <div>
    {% island "site-footer", props: { shopName: shop.name, year: 2025 }, hydrate: "lazy" %}
    {% endisland %}
  </div>
</footer>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        expect(model).toBeDefined();

        // Find the island tag
        const elements = model.elements;
        const islandTag = elements.find((el: any) => el.$type === 'IslandTag');
        expect(islandTag).toBeDefined();

        if (islandTag && 'name' in islandTag) {
            expect(islandTag.name).toBe('site-footer');
        }
    });

    test('parse product page template with price-display and cart-counter islands', async () => {
        const document = await parse(`
  <div>
    <div>
      <div>
        {% if product.imageUrl %}
          <img src={{ product.imageUrl }} alt={{ product.title }} />
        {% endif %}
      </div>

      <div>
        <h1>{{ product.title }}</h1>

        {% if product.description %}
          <div>{{ product.description }}</div>
        {% endif %}

        {% island "price-display", props: { amount: product.price, currency: shop.currency, compareAtPrice: product.compareAtPrice }, hydrate: "eager" %}
        {% endisland %}

        <div>
          {% island "cart-counter", props: { productId: product.id, productTitle: product.title, count: 0 }, hydrate: "lazy" %}
          {% endisland %}
        </div>
      </div>
    </div>
  </div>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        expect(model).toBeDefined();

        // Find island tags
        const elements = model.elements;
        const islandTags = elements.filter((el: any) => el.$type === 'IslandTag');
        expect(islandTags.length).toBeGreaterThanOrEqual(2);

        // Verify price-display island
        const priceDisplayIsland = islandTags.find((island: any) => island.name === 'price-display');
        expect(priceDisplayIsland).toBeDefined();

        // Verify cart-counter island
        const cartCounterIsland = islandTags.find((island: any) => island.name === 'cart-counter');
        expect(cartCounterIsland).toBeDefined();
    });

    test('parse collection page template with price-display and cart-counter islands per product', async () => {
        const document = await parse(`
  <div>
    <header>
      <h1>{{ collection.title }}</h1>
      {% if collection.description %}
        <p>{{ collection.description }}</p>
      {% endif %}
    </header>

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

          {% island "price-display", props: { amount: product.price, currency: shop.currency, compareAtPrice: product.compareAtPrice }, hydrate: "lazy" %}
          {% endisland %}

          {% island "cart-counter", props: { productId: product.id, productTitle: product.title, count: 0 }, hydrate: "lazy" %}
          {% endisland %}
        </article>
      {% endfor %}
    </div>
  </div>

  <script>
    console.log('Islands ready for hydration');
  </script>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        expect(model).toBeDefined();

        // Verify we have a for loop
        const elements = model.elements;
        const forTags = elements.filter((el: any) => el.$type === 'ForTag');
        expect(forTags.length).toBeGreaterThanOrEqual(1);

        // Verify islands are inside the for loop
        const forTag = forTags[0];
        if (forTag && 'content' in forTag) {
            const forContent = (forTag as any).content;
            const islandsInLoop = forContent.filter((el: any) => el.$type === 'IslandTag');
            expect(islandsInLoop.length).toBeGreaterThanOrEqual(2);
        }
    });

    test('parse complete theme: layout with header, content, and footer', async () => {
        // This simulates a full page render with all templates
        const document = await parse(`
<html>
<head>
  <title>{{ page_title }}</title>
</head>
<body>
  <header>
    <div>
      <a href=/?shop={{ shop.id }}>{{ shop.name }}</a>
    </div>
  </header>

  <main>
    <div>
      <h1>{{ collection.title }}</h1>

      {% for product in collection.products %}
        <div>
          <h2>{{ product.title }}</h2>

          {% island "price-display", props: { amount: product.price, currency: shop.currency }, hydrate: "lazy" %}
          {% endisland %}

          {% island "cart-counter", props: { productId: product.id, productTitle: product.title, count: 0 }, hydrate: "lazy" %}
          {% endisland %}
        </div>
      {% endfor %}
    </div>
  </main>

  <footer>
    {% island "site-footer", props: { shopName: shop.name, year: 2025 }, hydrate: "lazy" %}
    {% endisland %}
  </footer>
</body>
</html>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        expect(model).toBeDefined();

        // Verify all the major elements are present
        const elements = model.elements;

        // Check for for loop
        const forTags = elements.filter((el: any) => el.$type === 'ForTag');
        expect(forTags.length).toBeGreaterThanOrEqual(1);

        // Check for islands (both top-level and nested)
        const findAllIslands = (elements: any[]): any[] => {
            let islands: any[] = [];
            for (const el of elements) {
                if (el.$type === 'IslandTag') {
                    islands.push(el);
                }
                if (el.content && Array.isArray(el.content)) {
                    islands = islands.concat(findAllIslands(el.content));
                }
            }
            return islands;
        };

        const allIslands = findAllIslands(elements);
        expect(allIslands.length).toBeGreaterThanOrEqual(3);

        // Verify specific islands
        const hasFooterIsland = allIslands.some((island: any) => island.name === 'site-footer');
        expect(hasFooterIsland).toBe(true);
    });

    test('verify all hydration strategies are supported in templates', async () => {
        const document = await parse(`
        <div>
          {% island "price-display", props: { amount: 100 }, hydrate: "eager" %}
          {% endisland %}

          {% island "cart-counter", props: { count: 0 }, hydrate: "lazy" %}
          {% endisland %}

          {% island "site-footer", props: { year: 2025 }, hydrate: "idle" %}
          {% endisland %}

          {% island "newsletter", props: { source: "homepage" }, hydrate: "load" %}
          {% endisland %}
        </div>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        const elements = model.elements;
        const islandTags = elements.filter((el: any) => el.$type === 'IslandTag');

        expect(islandTags.length).toBe(4);

        // Verify different hydration strategies
        const hydrationStrategies = islandTags
            .map((island: any) => island.hydrate)
            .filter(Boolean);

        expect(hydrationStrategies).toContain('eager');
        expect(hydrationStrategies).toContain('lazy');
        expect(hydrationStrategies).toContain('idle');
        expect(hydrationStrategies).toContain('load');
    });

    test('parse nested control flow with islands inside conditionals', async () => {
        const document = await parse(`
        <div>
          {% for product in collection.products %}
            <div>
              <h3>{{ product.title }}</h3>

              {% if product.available %}
                {% island "price-display", props: { amount: product.price, currency: shop.currency }, hydrate: "lazy" %}
                {% endisland %}

                {% island "cart-counter", props: { productId: product.id, productTitle: product.title }, hydrate: "lazy" %}
                {% endisland %}
              {% else %}
                <p>Out of stock</p>
              {% endif %}
            </div>
          {% endfor %}
        </div>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        expect(model).toBeDefined();

        // Verify we have nested structures
        const elements = model.elements;
        const forTags = elements.filter((el: any) => el.$type === 'ForTag');
        expect(forTags.length).toBeGreaterThanOrEqual(1);
    });

    test('parse complex props with nested objects and variables', async () => {
        const document = await parse(`
        <div>
          {% island "product-configurator", props: {
            product: {
              id: product.id,
              title: product.title,
              price: product.price,
              variants: product.variants,
              options: product.options
            },
            shop: {
              id: shop.id,
              name: shop.name,
              currency: shop.currency
            },
            settings: {
              showComparePrice: true,
              enableQuantity: true,
              maxQuantity: 10
            }
          }, hydrate: "eager" %}
          {% endisland %}
        </div>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        const elements = model.elements;
        const islandTags = elements.filter((el: any) => el.$type === 'IslandTag');

        expect(islandTags.length).toBe(1);

        const island = islandTags[0];
        expect(island).toBeDefined();
        if (island && 'name' in island) {
            expect(island.name).toBe('product-configurator');
        }
    });

    test('parse multiple islands with different props on same page', async () => {
        const document = await parse(`
        <div>
          <h1>{{ product.title }}</h1>

          {% island "price-display", props: { amount: product.price, currency: shop.currency }, hydrate: "eager" %}
          {% endisland %}

          {% island "product-gallery", props: { images: product.images, selected: product.featured_image }, hydrate: "load" %}
          {% endisland %}

          {% island "cart-counter", props: { productId: product.id, productTitle: product.title, count: 0 }, hydrate: "lazy" %}
          {% endisland %}

          {% island "product-reviews", props: { productId: product.id, rating: product.rating }, hydrate: "idle" %}
          {% endisland %}

          {% island "related-products", props: { productId: product.id, maxItems: 4 }, hydrate: "lazy" %}
          {% endisland %}
        </div>
        `);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('Parser errors:', document.parseResult.parserErrors.map((e: any) => e.message));
        }

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        const elements = model.elements;
        const islandTags = elements.filter((el: any) => el.$type === 'IslandTag');

        // Should have 5 islands
        expect(islandTags.length).toBe(5);

        // Verify each island has a unique name
        const islandNames = islandTags.map((island: any) => island.name);
        expect(islandNames).toContain('price-display');
        expect(islandNames).toContain('product-gallery');
        expect(islandNames).toContain('cart-counter');
        expect(islandNames).toContain('product-reviews');
        expect(islandNames).toContain('related-products');
    });

    test('parse islands with filters in props', async () => {
        const document = await parse(`
        <div>
          {% island "product-card", props: {
            title: product.title | upcase,
            price: product.price | money,
            image: product.image | img_url,
            url: product.handle | prepend
          }, hydrate: "lazy" %}
          {% endisland %}
        </div>
        `);

        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const model = document.parseResult.value;
        const elements = model.elements;
        const islandTags = elements.filter((el: any) => el.$type === 'IslandTag');

        expect(islandTags.length).toBe(1);
        const island = islandTags[0];
        if (island && 'name' in island) {
            expect(island.name).toBe('product-card');
        }
    });
});
