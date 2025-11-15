import { describe, test, expect, beforeAll } from 'vitest';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

describe('Islands Integration with Full Liquid Support', () => {
    let parse: (input: string) => Promise<LangiumDocument<Model>>;

    beforeAll(async () => {
        const services = createSellhubLiquidServices(EmptyFileSystem);
        parse = parseHelper<Model>(services.SellhubLiquid);
    });

    describe('island tag basic syntax', () => {
        test('parse simple island', async () => {
            const document = await parse(`
                {% island "site-header" %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with props', async () => {
            const document = await parse(`
                {% island "site-footer", props: { shopName: shop.name } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with hydrate strategy', async () => {
            const document = await parse(`
                {% island "product-card", hydrate: "lazy" %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with props and hydrate', async () => {
            const document = await parse(`
                {% island "site-footer", props: { shopName: shop.name, year: "2025" }, hydrate: "lazy" %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('island with Liquid content', () => {
        test('parse island with Liquid output inside', async () => {
            const document = await parse(`
                {% island "product-card" %}
                    <h2>{{ product.title }}</h2>
                    <p>{{ product.price }}</p>
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with if statement inside', async () => {
            const document = await parse(`
                {% island "product-card", props: { product: product } %}
                    {% if product.available %}
                        <button>Add to Cart</button>
                    {% else %}
                        <button disabled>Sold Out</button>
                    {% endif %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with for loop inside', async () => {
            const document = await parse(`
                {% island "product-grid", props: { products: products }, hydrate: "lazy" %}
                    {% for product in products %}
                        <div>{{ product.title }}</div>
                    {% endfor %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with nested tags', async () => {
            const document = await parse(`
                {% island "product-list" %}
                    {% for product in collection.products %}
                        {% if product.available %}
                            <div class="{% cycle 'odd', 'even' %}">
                                {{ product.title | upcase }}
                            </div>
                        {% endif %}
                    {% endfor %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('island with Liquid objects in props', () => {
        test('parse island with product object', async () => {
            const document = await parse(`
                {% island "product-card", props: { product: product, showVendor: true } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with nested object properties', async () => {
            const document = await parse(`
                {% island "product-price", props: { price: product.price, currency: shop.currency } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with filtered values in props', async () => {
            const document = await parse(`
                {% island "hero", props: { title: page.title | upcase, image: page.image | img_url: 'large' } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with array props', async () => {
            const document = await parse(`
                {% island "image-gallery", props: { images: product.images, titles: product.images | map: 'alt' } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('island mixed with standard Liquid', () => {
        test('parse island after assign', async () => {
            const document = await parse(`
                {% assign featured = collections.frontpage.products.first %}
                {% island "hero-product", props: { product: featured } %}
                    <h1>{{ featured.title }}</h1>
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island inside if block', async () => {
            const document = await parse(`
                {% if customer %}
                    {% island "account-menu", props: { customer: customer }, hydrate: "load" %}
                        <p>Welcome {{ customer.name }}</p>
                    {% endisland %}
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island inside for loop', async () => {
            const document = await parse(`
                {% for product in collection.products %}
                    {% island "product-card", props: { product: product }, hydrate: "lazy" %}
                        <h3>{{ product.title }}</h3>
                    {% endisland %}
                {% endfor %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse multiple islands in document', async () => {
            const document = await parse(`
                {% island "site-header", props: { shop: shop } %}
                {% endisland %}

                <main>
                    {% for product in products %}
                        {% island "product-card", props: { product: product }, hydrate: "lazy" %}
                        {% endisland %}
                    {% endfor %}
                </main>

                {% island "site-footer", props: { year: "2025" } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('island with complex props', () => {
        test('parse island with number props', async () => {
            const document = await parse(`
                {% island "countdown", props: { days: 7, hours: 24, autoStart: true } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with boolean props', async () => {
            const document = await parse(`
                {% island "modal", props: { isOpen: false, closeOnOverlay: true } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with string literal props', async () => {
            const document = await parse(`
                {% island "button", props: { text: "Add to Cart", variant: "primary" } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with mixed prop types', async () => {
            const document = await parse(`
                {% island "product-configurator", props: {
                    product: product,
                    maxQuantity: 10,
                    showPrice: true,
                    ctaText: "Buy Now"
                } %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('island with all hydration strategies', () => {
        test('parse island with eager hydration', async () => {
            const document = await parse(`
                {% island "search-bar", hydrate: "load" %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with lazy hydration', async () => {
            const document = await parse(`
                {% island "reviews-section", hydrate: "lazy" %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse island with idle hydration', async () => {
            const document = await parse(`
                {% island "newsletter-signup", hydrate: "idle" %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    describe('realistic theme examples', () => {
        test('parse header with navigation island', async () => {
            const document = await parse(`
                <header>
                    {% island "site-navigation", props: {
                        logo: shop.name,
                        menuItems: linklists.main-menu.links,
                        cartCount: cart.item_count
                    }, hydrate: "load" %}
                        <nav>
                            {% for link in linklists.main-menu.links %}
                                <a href="{{ link.url }}">{{ link.title }}</a>
                            {% endfor %}
                        </nav>
                    {% endisland %}
                </header>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse product page with multiple islands', async () => {
            const document = await parse(`
                {% assign current_variant = product.selected_or_first_available_variant %}

                {% island "product-media", props: { images: product.images }, hydrate: "load" %}
                    <img src="{{ product.featured_image | img_url: 'large' }}" alt="{{ product.title }}">
                {% endisland %}

                {% island "product-form", props: {
                    product: product,
                    variant: current_variant,
                    available: current_variant.available
                }, hydrate: "load" %}
                    <form action="/cart/add" method="post">
                        <select name="id">
                            {% for variant in product.variants %}
                                <option value="{{ variant.id }}">{{ variant.title }}</option>
                            {% endfor %}
                        </select>
                        <button type="submit">Add to Cart</button>
                    </form>
                {% endisland %}

                {% island "product-recommendations", props: { productId: product.id }, hydrate: "lazy" %}
                {% endisland %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse collection page with grid island', async () => {
            const document = await parse(`
                <div class="collection">
                    <h1>{{ collection.title }}</h1>

                    {% island "product-grid", props: {
                        products: collection.products,
                        showVendor: settings.show_vendor,
                        columns: 3
                    }, hydrate: "lazy" %}
                        <div class="grid">
                            {% for product in collection.products %}
                                <div class="product-card">
                                    <img src="{{ product.featured_image | img_url: 'medium' }}">
                                    <h3>{{ product.title }}</h3>
                                    <p>{{ product.price | money }}</p>
                                </div>
                            {% endfor %}
                        </div>
                    {% endisland %}
                </div>
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });

        test('parse cart with dynamic island', async () => {
            const document = await parse(`
                {% if cart.item_count > 0 %}
                    {% island "cart-drawer", props: {
                        items: cart.items,
                        totalPrice: cart.total_price,
                        currency: shop.currency
                    }, hydrate: "load" %}
                        {% for item in cart.items %}
                            <div class="cart-item">
                                <img src="{{ item.image | img_url: 'small' }}">
                                <span>{{ item.product.title }}</span>
                                <span>{{ item.quantity }}</span>
                                <span>{{ item.line_price | money }}</span>
                            </div>
                        {% endfor %}
                        <div class="cart-total">
                            Total: {{ cart.total_price | money }}
                        </div>
                    {% endisland %}
                {% else %}
                    <p>Your cart is empty</p>
                {% endif %}
            `);

            expect(document.parseResult.parserErrors).toHaveLength(0);
        });
    });
});
