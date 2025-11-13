import { describe, test, expect, beforeAll } from 'vitest';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

describe('Complete Liquid Language Integration Tests', () => {
    let parse: (input: string) => Promise<LangiumDocument<Model>>;

    beforeAll(async () => {
        const services = createSellhubLiquidServices(EmptyFileSystem);
        parse = parseHelper<Model>(services.SellhubLiquid);
    });

    test('parse complex product page template', async () => {
        const document = await parse(`
            {% comment %}
            Product page template with Islands
            {% endcomment %}

            {% assign current_variant = product.selected_or_first_available_variant %}
            {% assign featured_image = current_variant.featured_image | default: product.featured_image %}

            <div class="product-page">
                {% island "product-gallery", props: {
                    images: product.images,
                    featuredImage: featured_image
                }, hydrate: "load" %}
                    <div class="gallery">
                        {% for image in product.images %}
                            <img src="{{ image | img_url: 'large' }}" alt="{{ image.alt }}">
                        {% endfor %}
                    </div>
                {% endisland %}

                <div class="product-info">
                    <h1>{{ product.title }}</h1>

                    {% if product.vendor %}
                        <p class="vendor">{{ product.vendor }}</p>
                    {% endif %}

                    <div class="price">
                        {% if current_variant.compare_at_price > current_variant.price %}
                            <span class="sale-price">{{ current_variant.price | money }}</span>
                            <span class="original-price">{{ current_variant.compare_at_price | money }}</span>
                        {% else %}
                            <span>{{ current_variant.price | money }}</span>
                        {% endif %}
                    </div>

                    {% island "product-form", props: {
                        product: product,
                        currentVariant: current_variant
                    }, hydrate: "load" %}
                        <form action="/cart/add" method="post">
                            {% unless product.has_only_default_variant %}
                                <select name="id">
                                    {% for variant in product.variants %}
                                        <option
                                            value="{{ variant.id }}"
                                            {% if variant == current_variant %}selected{% endif %}
                                        >
                                            {{ variant.title }}
                                        </option>
                                    {% endfor %}
                                </select>
                            {% endunless %}

                            <button type="submit" {% unless current_variant.available %}disabled{% endunless %}>
                                {% if current_variant.available %}
                                    Add to Cart
                                {% else %}
                                    Sold Out
                                {% endif %}
                            </button>
                        </form>
                    {% endisland %}

                    <div class="description">
                        {{ product.description }}
                    </div>
                </div>

                {% if product.tags.size > 0 %}
                    <div class="tags">
                        {% for tag in product.tags %}
                            <a href="{{ tag | link_to_tag: tag }}">{{ tag }}</a>
                        {% endfor %}
                    </div>
                {% endif %}
            </div>

            {% island "product-recommendations", props: { productId: product.id }, hydrate: "lazy" %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse collection page with filters', async () => {
        const document = await parse(`
            {% liquid
                assign sort_by = collection.sort_by | default: collection.default_sort_by
                assign products_to_show = collection.products
            %}

            <div class="collection-page">
                <header>
                    <h1>{{ collection.title }}</h1>
                    {% if collection.description != blank %}
                        <div class="description">{{ collection.description }}</div>
                    {% endif %}
                </header>

                {% island "collection-filters", props: {
                    filters: collection.filters,
                    activeFilters: current_tags,
                    sortBy: sort_by
                }, hydrate: "load" %}
                    <div class="filters">
                        {% for filter in collection.filters %}
                            <div class="filter-group">
                                <h3>{{ filter.label }}</h3>
                                {% for value in filter.values %}
                                    <label>
                                        <input type="checkbox" value="{{ value.value }}">
                                        {{ value.label }} ({{ value.count }})
                                    </label>
                                {% endfor %}
                            </div>
                        {% endfor %}
                    </div>
                {% endisland %}

                {% island "product-grid", props: {
                    products: products_to_show,
                    columns: 4
                }, hydrate: "lazy" %}
                    <div class="product-grid">
                        {% for product in products_to_show %}
                            <div class="product-card">
                                <a href="{{ product.url }}">
                                    <img src="{{ product.featured_image | img_url: 'medium' }}"
                                         alt="{{ product.title }}">
                                </a>
                                <h3>
                                    <a href="{{ product.url }}">{{ product.title }}</a>
                                </h3>
                                <div class="price">
                                    {{ product.price | money }}
                                </div>
                            </div>
                        {% else %}
                            <p>No products found</p>
                        {% endfor %}
                    </div>
                {% endisland %}

                {% if paginate.pages > 1 %}
                    <div class="pagination">
                        {% if paginate.previous %}
                            <a href="{{ paginate.previous.url }}">Previous</a>
                        {% endif %}

                        {% for part in paginate.parts %}
                            {% if part.is_link %}
                                <a href="{{ part.url }}">{{ part.title }}</a>
                            {% else %}
                                <span>{{ part.title }}</span>
                            {% endif %}
                        {% endfor %}

                        {% if paginate.next %}
                            <a href="{{ paginate.next.url }}">Next</a>
                        {% endif %}
                    </div>
                {% endif %}
            </div>
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse cart template with nested logic', async () => {
        const document = await parse(`
            {% assign cart_count = cart.item_count %}

            {% island "cart-page", props: {
                items: cart.items,
                totalPrice: cart.total_price,
                itemCount: cart_count
            }, hydrate: "load" %}
                {% if cart_count > 0 %}
                    <div class="cart-items">
                        {% for item in cart.items %}
                            <div class="cart-item">
                                <img src="{{ item.image | img_url: 'small' }}" alt="{{ item.title }}">

                                <div class="item-details">
                                    <h3>{{ item.product.title }}</h3>

                                    {% unless item.variant.title contains 'Default' %}
                                        <p class="variant">{{ item.variant.title }}</p>
                                    {% endunless %}

                                    {% if item.properties %}
                                        <dl>
                                            {% for property in item.properties %}
                                                <dt>{{ property.first }}:</dt>
                                                <dd>{{ property.last }}</dd>
                                            {% endfor %}
                                        </dl>
                                    {% endif %}
                                </div>

                                <div class="quantity">
                                    <input type="number"
                                           value="{{ item.quantity }}"
                                           min="0"
                                           max="{{ item.variant.inventory_quantity }}">
                                </div>

                                <div class="price">
                                    {{ item.line_price | money }}
                                </div>
                            </div>
                        {% endfor %}
                    </div>

                    <div class="cart-summary">
                        {% if cart.cart_level_discount_applications.size > 0 %}
                            <div class="discounts">
                                {% for discount in cart.cart_level_discount_applications %}
                                    <div class="discount">
                                        {{ discount.title }}: -{{ discount.total_allocated_amount | money }}
                                    </div>
                                {% endfor %}
                            </div>
                        {% endif %}

                        <div class="total">
                            <strong>Total:</strong>
                            <span>{{ cart.total_price | money }}</span>
                        </div>

                        <button class="checkout-button">
                            Proceed to Checkout
                        </button>
                    </div>
                {% else %}
                    <div class="empty-cart">
                        <p>Your cart is empty</p>
                        <a href="/collections/all">Continue Shopping</a>
                    </div>
                {% endif %}
            {% endisland %}
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse blog template with articles', async () => {
        const document = await parse(`
            {% liquid
                assign article_count = blog.articles.size
                assign featured_article = blog.articles.first
            %}

            <div class="blog-page">
                <h1>{{ blog.title }}</h1>

                {% if featured_article %}
                    <article class="featured">
                        <h2>
                            <a href="{{ featured_article.url }}">{{ featured_article.title }}</a>
                        </h2>

                        {% if featured_article.image %}
                            <img src="{{ featured_article.image | img_url: 'large' }}"
                                 alt="{{ featured_article.title }}">
                        {% endif %}

                        <div class="excerpt">
                            {{ featured_article.excerpt_or_content | truncatewords: 50 }}
                        </div>

                        <div class="meta">
                            <time datetime="{{ featured_article.published_at | date: '%Y-%m-%d' }}">
                                {{ featured_article.published_at | date: '%B %d, %Y' }}
                            </time>
                            <span class="author">by {{ featured_article.author }}</span>

                            {% if featured_article.tags.size > 0 %}
                                <div class="tags">
                                    {% for tag in featured_article.tags %}
                                        <a href="{{ blog.url }}/tagged/{{ tag | handle }}">{{ tag }}</a>
                                    {% endfor %}
                                </div>
                            {% endif %}
                        </div>
                    </article>
                {% endif %}

                <div class="articles-list">
                    {% for article in blog.articles offset:1 %}
                        <article>
                            <h3>
                                <a href="{{ article.url }}">{{ article.title }}</a>
                            </h3>

                            <p>{{ article.excerpt | strip_html | truncatewords: 30 }}</p>

                            <a href="{{ article.url }}">Read more</a>
                        </article>
                    {% endfor %}
                </div>

                {% island "newsletter-signup", props: { blogTitle: blog.title }, hydrate: "idle" %}
                    <div class="newsletter">
                        <h3>Subscribe to {{ blog.title }}</h3>
                        <form action="/contact" method="post">
                            <input type="email" name="contact[email]" placeholder="Your email">
                            <button type="submit">Subscribe</button>
                        </form>
                    </div>
                {% endisland %}
            </div>
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse theme with multiple sections and islands', async () => {
        const document = await parse(`
            {% # Header section %}
            <header>
                {% island "site-header", props: {
                    logo: shop.name,
                    cartCount: cart.item_count,
                    customer: customer
                }, hydrate: "load" %}
                    <div class="header-content">
                        <a href="/" class="logo">{{ shop.name }}</a>

                        {% if shop.customer_accounts_enabled and customer %}
                            <a href="/account">{{ customer.name }}</a>
                        {% elsif shop.customer_accounts_enabled %}
                            <a href="/account/login">Login</a>
                        {% endif %}

                        <a href="/cart">Cart ({{ cart.item_count }})</a>
                    </div>
                {% endisland %}
            </header>

            {% # Main navigation %}
            <nav>
                {% for link in linklists.main-menu.links %}
                    {% if link.links.size > 0 %}
                        <div class="menu-item has-dropdown">
                            <a href="{{ link.url }}">{{ link.title }}</a>
                            <ul class="dropdown">
                                {% for child_link in link.links %}
                                    <li>
                                        <a href="{{ child_link.url }}">{{ child_link.title }}</a>
                                    </li>
                                {% endfor %}
                            </ul>
                        </div>
                    {% else %}
                        <a href="{{ link.url }}">{{ link.title }}</a>
                    {% endif %}
                {% endfor %}
            </nav>

            {% # Main content %}
            <main>
                {{ content_for_layout }}
            </main>

            {% # Footer %}
            <footer>
                {% island "site-footer", props: {
                    year: "now" | date: "%Y",
                    shopName: shop.name,
                    socialLinks: settings.social_links
                }, hydrate: "lazy" %}
                    <div class="footer-content">
                        {% for link in linklists.footer.links %}
                            <div class="footer-column">
                                <h4>{{ link.title }}</h4>
                                {% if link.links.size > 0 %}
                                    <ul>
                                        {% for child in link.links %}
                                            <li><a href="{{ child.url }}">{{ child.title }}</a></li>
                                        {% endfor %}
                                    </ul>
                                {% endif %}
                            </div>
                        {% endfor %}

                        <div class="copyright">
                            &copy; {{ "now" | date: "%Y" }} {{ shop.name }}
                        </div>
                    </div>
                {% endisland %}
            </footer>
        `);

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });
});
