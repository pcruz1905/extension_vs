import * as vscode from "vscode";

/**
 * Liquid context schemas from backend
 * Based on: backend/src/schema/*.ts
 */
const LIQUID_CONTEXTS = {
  product: {
    // Core fields
    id: { type: "string", description: "Unique product identifier" },
    shopId: { type: "string", description: "Shop identifier" },
    title: { type: "string", description: "Product title" },
    description: { type: "string", description: "Product description" },
    handle: { type: "string", description: "Product URL handle/slug" },
    vendor: { type: "string", description: "Product vendor/brand name" },
    productType: { type: "string", description: "Product type/category" },
    status: { type: "string", description: "Product status: active, draft, archived" },

    // Pricing & availability
    price: { type: "number", description: "Product price (from first variant)" },
    compareAtPrice: { type: "number", description: "Compare at price for sale display" },
    availableForSale: { type: "boolean", description: "Whether product is available for purchase" },

    // Media
    imageUrl: { type: "string", description: "Primary product image URL" },
    images: { type: "array", description: "Array of product images" },

    // Relations
    variants: { type: "array", description: "Array of product variants" },

    // Timestamps
    publishedAt: { type: "string", description: "Publication date (ISO DateTime UTC)" },
    createdAt: { type: "string", description: "Creation date (ISO DateTime UTC)" },
    updatedAt: { type: "string", description: "Last update date (ISO DateTime UTC)" },
  },
  collection: {
    // Core fields
    id: { type: "string", description: "Unique collection identifier" },
    shopId: { type: "string", description: "Shop identifier" },
    title: { type: "string", description: "Collection title" },
    description: { type: "string", description: "Collection description" },
    handle: { type: "string", description: "Collection URL handle/slug" },
    imageUrl: { type: "string", description: "Collection image URL" },

    // Relations
    products: { type: "array", description: "Array of products in this collection" },

    // Timestamps
    publishedAt: { type: "string", description: "Publication date (ISO DateTime UTC)" },
    createdAt: { type: "string", description: "Creation date (ISO DateTime UTC)" },
    updatedAt: { type: "string", description: "Last update date (ISO DateTime UTC)" },
  },
  shop: {
    // Simplified shop object (from render-pipeline.ts)
    id: { type: "string", description: "Unique shop identifier" },
    name: { type: "string", description: "Shop name" },
    locale: { type: "string", description: "Shop locale (e.g., en-US, fr-FR)" },
    currency: { type: "string", description: "Shop currency code (USD, EUR, etc.)" },
  },
};

/**
 * Completion provider for Liquid context objects (product, collection, shop)
 * Triggers on: {{ product., {{ collection., {{ shop.
 */
export class ContextCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    // Check if we're accessing a context object property
    // Works in both {{ product. }} and inside island props: { productId: product. }
    const contextType = this.extractContextType(linePrefix);
    if (!contextType) {
      return undefined;
    }

    const properties = LIQUID_CONTEXTS[contextType as keyof typeof LIQUID_CONTEXTS];
    if (!properties) {
      return undefined;
    }

    return this.createPropertyCompletionItems(properties);
  }

  /**
   * Extract the context type (product, collection, shop) from line
   * Also handles loop variables like: {% for prod in collection.products %}
   * Works in {{ }}, {% %}, and inside island props
   */
  private extractContextType(linePrefix: string): string | null {
    // Match: {{ product. or {{ collection. or {{ shop.
    const directMatch = linePrefix.match(/\{\{\s*(product|collection|shop)\./);
    if (directMatch) {
      return directMatch[1];
    }

    // Match in Liquid tags: {% for prod in collection. or {% if product.
    // Pattern: {% ... (product|collection|shop).
    const tagMatch = linePrefix.match(/\{%[^%]*[\s\(](product|collection|shop)\./);
    if (tagMatch) {
      return tagMatch[1];
    }

    // Match inside island props: productId: product. or productId: prod.
    // Pattern: : variableName. (after a colon in props)
    const propsMatch = linePrefix.match(/:\s*(\w+)\.$/);
    if (propsMatch) {
      const varName = propsMatch[1];
      if (varName === 'product' || varName === 'collection' || varName === 'shop') {
        return varName;
      }
      // Treat other variables as products (e.g., prod, item, p)
      return 'product';
    }

    // Match loop variables that reference products in {{ }}
    // Pattern: {{ variableName. where variableName could be anything
    const varMatch = linePrefix.match(/\{\{\s*(\w+)\./);
    if (varMatch) {
      const varName = varMatch[1];

      // Check if this is a loop variable
      // We'll treat unknown variables as potential product variables
      // since they're most commonly used in for loops over products
      if (varName !== 'product' && varName !== 'collection' && varName !== 'shop') {
        // Assume it's a product from a loop (e.g., prod, item, p, etc.)
        return 'product';
      }
    }

    return null;
  }

  /**
   * Create completion items for context properties
   */
  private createPropertyCompletionItems(
    properties: Record<string, { type: string; description: string }>
  ): vscode.CompletionItem[] {
    return Object.entries(properties).map(([name, prop]) => {
      const item = new vscode.CompletionItem(
        name,
        vscode.CompletionItemKind.Property
      );

      // Create documentation
      const doc = new vscode.MarkdownString();
      doc.appendMarkdown(`**Type:** \`${prop.type}\`\n\n`);
      doc.appendMarkdown(prop.description);
      item.documentation = doc;

      // Add detail
      item.detail = prop.type;

      // Simple text insertion
      item.insertText = name;

      return item;
    });
  }
}
