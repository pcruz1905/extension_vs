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

describe('Forloop Variables Tests', () => {

    test('parse forloop.index', async () => {
        const document = await parse(`
        {% for item in items %}
          <span>{{ forloop.index }}</span>
        {% endfor %}
        `);

        console.log('\n=== forloop.index ===');
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

    test('parse forloop.first', async () => {
        const document = await parse(`
        {% for item in items %}
          <div class="{% if forloop.first %}active{% endif %}">
            {{ item.name }}
          </div>
        {% endfor %}
        `);

        console.log('\n=== forloop.first ===');
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

    test('parse all forloop properties', async () => {
        const document = await parse(`
        {% for item in items %}
          <div>
            Index: {{ forloop.index }}
            Index0: {{ forloop.index0 }}
            First: {{ forloop.first }}
            Last: {{ forloop.last }}
            Length: {{ forloop.length }}
            RIndex: {{ forloop.rindex }}
            RIndex0: {{ forloop.rindex0 }}
          </div>
        {% endfor %}
        `);

        console.log('\n=== All forloop properties ===');
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

    test('parse nested for loops with forloop', async () => {
        const document = await parse(`
        {% for category in categories %}
          <div class="category {% if forloop.first %}active{% endif %}">
            <h2>{{ category.name }}</h2>
            {% for item in category.items %}
              <div class="item">
                {{ item.name }} ({{ forloop.index }})
              </div>
            {% endfor %}
          </div>
        {% endfor %}
        `);

        console.log('\n=== Nested for loops ===');
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

    test('parse positions list from user example', async () => {
        const document = await parse(`
    {% if page.positions %}
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Open Positions</h2>
      </div>

      <div class="positions-list">
        {% for position in page.positions %}
        <div class="position-card">
          <h3>{{ position.title }}</h3>
          <span>{{ position.type }}</span>

          <div class="position-meta">
            <div class="meta-item">
              <span>{{ position.location }}</span>
            </div>
            <div class="meta-item">
              <span>{{ position.department }}</span>
            </div>
          </div>

          <p>{{ position.description }}</p>

          <div class="position-footer">
            <div class="position-tags">
              {% for skill in position.skills %}
              <span class="position-tag">{{ skill }}</span>
              {% endfor %}
            </div>
            <a href="#apply" class="apply-button">Apply Now</a>
          </div>
        </div>
        {% endfor %}
      </div>
    </section>
    {% endif %}
        `);

        console.log('\n=== Positions list ===');
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
