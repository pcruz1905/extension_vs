import { describe, expect, test } from 'vitest';
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createSellhubLiquidServices } from '../sellhub-liquid-module.js';
import type { Model } from '../generated/ast.js';

const services = createSellhubLiquidServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.SellhubLiquid);

describe('New Template Errors', () => {
    test('parse search input template', async () => {
        const document = await parse(`
<div class="search-container">
  <input type="text" class="search-input" placeholder="Search for answers...">
</div>
        `);

        console.log('=== Search Input ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('Parser errors:', document.parseResult.parserErrors.map(e => e.message));
        }

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse legal header template', async () => {
        const document = await parse(`
<!-- Header -->
<div class="legal-header">
  <h1 class="legal-title">{{ page.title }}</h1>
  {% if page.lastUpdated %}
  <p class="legal-updated">Last Updated: {{ page.lastUpdated | date: "%B %d, %Y" }}</p>
  {% endif %}
</div>
        `);

        console.log('=== Legal Header ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('Parser errors:', document.parseResult.parserErrors.map(e => e.message));
        }

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse instagram feed with range', async () => {
        const document = await parse(`
<!-- Instagram Feed Section -->
<section class="section">
  <div class="container">
    <div class="section-header">
      <h2 class="section-title">Follow Us @{{ shop.name }}</h2>
      <p class="section-subtitle">Get inspired by our community</p>
    </div>

    <div class="instagram-grid">
      {% for i in (1..6) %}
      <div class="instagram-item">
        <img src="https://images.unsplash.com/photo-{{ 1441986300917 | plus: i }}?w=400" alt="Instagram post {{ i }}" class="instagram-image" loading="lazy">
      </div>
      {% endfor %}
    </div>
  </div>
</section>
        `);

        console.log('=== Instagram Feed ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('Parser errors:', document.parseResult.parserErrors.map(e => e.message));
        }
        if (document.parseResult.lexerErrors.length > 0) {
            console.log('Lexer errors:', document.parseResult.lexerErrors.map(e => e.message));
        }

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse simple range expression', async () => {
        const document = await parse(`
{% for i in (1..6) %}
  {{ i }}
{% endfor %}
        `);

        console.log('=== Simple Range ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('Parser errors:', document.parseResult.parserErrors.map(e => e.message));
        }

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });

    test('parse nested for and if with else', async () => {
        const document = await parse(`
{% for i in (1..5) %}
  {% if i <= 3 %}
    <span>Small</span>
  {% else %}
    <span>Large</span>
  {% endif %}
{% endfor %}
        `);

        console.log('=== Nested For/If with Else ===');
        console.log('Lexer errors:', document.parseResult.lexerErrors.length);
        console.log('Parser errors:', document.parseResult.parserErrors.length);

        if (document.parseResult.parserErrors.length > 0) {
            console.log('Parser errors:', document.parseResult.parserErrors.map(e => e.message));
        }

        expect(document.parseResult.parserErrors).toHaveLength(0);
    });
});
