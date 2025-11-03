import * as vscode from "vscode";
import { KVClient } from "../kv/kvClient";
import type { ComponentMetadata, PropDefinition } from "../types";

const ISLAND_PATTERN_REGEX =
  /\{[{%]\s*island(?:\s+["']?([^"'%}\s]*)["']?)?(?:\s*,\s*props\s*:\s*(\{[\s\S]*?)?)?\s*(?:[}%]\}|$)?/;

/**
 * Completion provider for Sellhubb Liquid components
 */
export class LiquidCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private kvClient: KVClient) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Check if we're inside an island tag
    if (this.isIslandTagContext(textBeforeCursor)) {
      const componentName = this.getComponentNameInScope(document, position);

      // If we have a component name and are inside props
      if (componentName && this.isPropsContext(textBeforeCursor)) {
        const isInsideValue = /props:\s*{[^{}:,]*:[^,{}]*$/.test(
          textBeforeCursor
        );

        if (isInsideValue) {
          return [];
        }

        return await this.providePropsCompletions(componentName);
      }

      if (this.isHydrateValueContext(textBeforeCursor)) {
        return this.provideHydrateValueCompletions();
      }

      // Otherwise, provide component name completions with island top level completion
      return [
        ...(await this.provideComponentNameCompletions(document, position)),
        ...this.provideIslandTopLevelCompletions(),
      ];
    }

    return undefined;
  }

  /**
   * Check if cursor is inside an island tag: {% island "..." or {{ island "..."
   */
  private isIslandTagContext(textBeforeCursor: string): boolean {
    // Match partial island openings like:
    // {{ island "
    // {% island 'some
    // {{ island   "foo
    const match = textBeforeCursor.match(ISLAND_PATTERN_REGEX);

    return !!match;
  }

  /**
   * Check if cursor is inside a props object: props: { ...
   */
  private isPropsContext(textBeforeCursor: string): boolean {
    // Match: props: { or props:{
    const propsPattern = /props\s*:\s*\{/;
    const match = textBeforeCursor.match(propsPattern);

    if (!match) {
      return false;
    }

    // Count braces to ensure we're still inside the props object
    const afterProps = textBeforeCursor.substring(
      match.index! + match[0].length
    );
    const openBraces = (afterProps.match(/\{/g) || []).length;
    const closeBraces = (afterProps.match(/\}/g) || []).length;

    return openBraces >= closeBraces;
  }

  /**
   * Extract component name from the island tag in the current scope
   */
  private getComponentNameInScope(
    document: vscode.TextDocument,
    position: vscode.Position
  ): string | null {
    // Search backwards from current position to find the island tag
    for (let i = position.line; i >= Math.max(0, position.line - 20); i--) {
      const lineText = document.lineAt(i).text;

      // Match: {% island "component-name"
      const match = lineText.match(ISLAND_PATTERN_REGEX);
      if (match) {
        return match[1];
      }

      // If we hit the end of a previous island tag, stop searching
      if (lineText.includes("%}") && i < position.line) {
        break;
      }
    }

    return null;
  }

  /**
   * Provide completions for component names with auto-filled required props
   */
  private async provideComponentNameCompletions(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<
    vscode.CompletionItem[]
  > {
    try {
      const manifest = await this.kvClient.getComponentManifest();

      const items = await Promise.all(
        manifest.components.map(async (componentName) => {
          const item = new vscode.CompletionItem(
            componentName,
            vscode.CompletionItemKind.Class
          );
          item.detail = "Sellhubb Component";

          // Fetch metadata to auto-fill required props
          try {
            const metadata = await this.kvClient.getComponentMetadata(componentName);

            // Generate snippet with auto-filled required props
            const propsSnippet = this.generatePropsSnippet(metadata, document, position);
            const hydrateTabstop = propsSnippet.tabstopCount + 1;

            item.insertText = new vscode.SnippetString(
              `${componentName}", props: { ${propsSnippet.snippet} }, hydrate: "\${${hydrateTabstop}|eager,lazy,idle|}" %}\n{% endisland %}`
            );

            // Add documentation
            if (metadata.description) {
              const docs = new vscode.MarkdownString();
              docs.appendMarkdown(`${metadata.description}\n\n`);
              docs.appendMarkdown("**Props:**\n\n");
              Object.entries(metadata.props || {}).forEach(([name, def]) => {
                const req = def.required ? "_(required)_" : "_(optional)_";
                docs.appendMarkdown(`- **${name}** \`${def.type}\` ${req}\n`);
              });
              item.documentation = docs;
            }
          } catch (error) {
            // Fallback if metadata fetch fails
            item.insertText = new vscode.SnippetString(
              `${componentName}", props: { $1 }, hydrate: "\${2|eager,lazy,idle|}" %}\n{% endisland %}`
            );
          }

          item.sortText = `0_${componentName}`;
          return item;
        })
      );

      return items;
    } catch (error) {
      console.error("Failed to fetch component manifest:", error);
      return [];
    }
  }

  /**
   * Generate props snippet with auto-filled required props
   */
  private generatePropsSnippet(
    metadata: ComponentMetadata,
    document: vscode.TextDocument,
    position: vscode.Position
  ): { snippet: string; tabstopCount: number } {
    const propEntries = Object.entries(metadata.props || {});

    if (propEntries.length === 0) {
      return { snippet: '$1', tabstopCount: 1 };
    }

    let tabstop = 1;
    const propSnippets: string[] = [];

    // First, add all required props with smart defaults
    const requiredProps = propEntries.filter(([_, prop]) => prop.required);
    for (const [propName, prop] of requiredProps) {
      const defaultValue = this.getSmartDefaultForProp(propName, prop, document, position);
      propSnippets.push(`${propName}: \${${tabstop}:${defaultValue}}`);
      tabstop++;
    }

    // Add placeholder for optional props
    if (propSnippets.length === 0) {
      propSnippets.push(`$${tabstop}`);
      tabstop++;
    } else {
      // Add empty tabstop at the end for adding more props
      propSnippets.push(`$${tabstop}`);
      tabstop++;
    }

    return {
      snippet: propSnippets.join(', '),
      tabstopCount: tabstop - 1
    };
  }

  /**
   * Get smart default value for a prop based on its name and type
   * Detects loop variables and uses them instead of hardcoded entity names
   */
  private getSmartDefaultForProp(
    propName: string,
    prop: PropDefinition,
    document: vscode.TextDocument,
    position: vscode.Position
  ): string {
    // Smart defaults based on prop name patterns
    if (propName.includes('Id')) {
      // productId, variantId, etc. -> product.id (or prod.id in loops)
      const entityName = propName.replace(/Id$/, '').toLowerCase();

      // Detect if we're in a loop and use the loop variable
      const loopVar = this.detectLoopVariable(document, position, 'product');
      const varName = loopVar || entityName;

      return `${varName}.id`;
    }

    if (propName.includes('Title') || propName.includes('Name')) {
      // productTitle, productName -> product.title (or prod.title in loops)
      const entityName = propName.replace(/(Title|Name)$/, '').toLowerCase();

      // Detect loop variable
      const loopVar = this.detectLoopVariable(document, position, 'product');
      const varName = loopVar || entityName;

      return `${varName}.title`;
    }

    if (propName === 'amount' || propName === 'price') {
      // Will work with product.price or prod.price (user can edit)
      const loopVar = this.detectLoopVariable(document, position, 'product');
      return loopVar ? `${loopVar}.price` : 'product.price';
    }

    if (propName === 'compareAtPrice') {
      const loopVar = this.detectLoopVariable(document, position, 'product');
      return loopVar ? `${loopVar}.compareAtPrice` : 'product.compareAtPrice';
    }

    if (propName === 'currency') {
      return '"USD"';
    }

    if (propName === 'handle') {
      const loopVar = this.detectLoopVariable(document, position, 'product');
      return loopVar ? `${loopVar}.handle` : 'product.handle';
    }

    if (propName === 'count') {
      return '0';
    }

    // Type-based defaults
    switch (prop.type) {
      case 'string':
        return '""';
      case 'number':
        return '0';
      case 'boolean':
        return 'false';
      default:
        return '""';
    }
  }

  /**
   * Detect loop variable name for a given entity type by scanning backwards
   * Returns the variable name if found, otherwise returns null
   * Example: {% for prod in collection.products %} -> returns 'prod'
   */
  private detectLoopVariable(
    document: vscode.TextDocument,
    position: vscode.Position,
    entityType: 'product' | 'collection' | 'shop'
  ): string | null {
    // Scan backwards up to 50 lines to find loop declarations
    for (let i = position.line; i >= Math.max(0, position.line - 50); i--) {
      const lineText = document.lineAt(i).text;

      // Match: {% for varName in collection.products %}
      // Match: {% for varName in products %}
      // Match: {% for varName in all_products %}
      const forLoopMatch = lineText.match(/\{%\s*for\s+(\w+)\s+in\s+(?:\w+\.)?(products|collections|items|all_products)/);
      if (forLoopMatch) {
        const varName = forLoopMatch[1];
        const iterableType = forLoopMatch[2];

        // If iterating over products/items, assume the variable is a product
        if (entityType === 'product' &&
            (iterableType === 'products' || iterableType === 'items' || iterableType === 'all_products')) {
          return varName;
        }

        // If iterating over collections, assume the variable is a collection
        if (entityType === 'collection' && iterableType === 'collections') {
          return varName;
        }
      }

      // If we hit an endfor, we've exited the loop scope - stop searching
      if (lineText.includes('{% endfor %}')) {
        break;
      }
    }

    return null;
  }

  /**
   * Provide completions for component props
   */
  private async providePropsCompletions(
    componentName: string
  ): Promise<vscode.CompletionItem[]> {
    try {
      const metadata: ComponentMetadata =
        await this.kvClient.getComponentMetadata(componentName);

      if (!metadata.props || Object.keys(metadata.props).length === 0) {
        return [];
      }

      return Object.entries(metadata.props).map(([propName, propDef]) => {
        const item = new vscode.CompletionItem(
          propName,
          vscode.CompletionItemKind.Property
        );

        // Build detail string
        const requiredLabel = propDef.required ? "required" : "optional";
        item.detail = `${propDef.type} (${requiredLabel})`;

        // Build documentation
        const docs = new vscode.MarkdownString();
        docs.appendMarkdown(`**${propName}** \`${propDef.type}\`\n\n`);
        if (propDef.description) {
          docs.appendMarkdown(propDef.description);
        }
        if (propDef.required) {
          docs.appendMarkdown("\n\n_Required_");
        }
        item.documentation = docs;

        // Create snippet for prop insertion
        item.insertText = new vscode.SnippetString(`${propName}: \${1:value}`);

        // Sort required props first
        item.sortText = propDef.required ? `0_${propName}` : `1_${propName}`;

        return item;
      });
    } catch (error) {
      console.error(`Failed to fetch metadata for ${componentName}:`, error);
      return [];
    }
  }

  private isHydrateValueContext(text: string): boolean {
    // Cursor is after hydrate: "
    return /hydrate:\s*"[^"]*$/.test(text);
  }

  /**
   * Provide island top level completions
   */
  private provideIslandTopLevelCompletions(): vscode.CompletionItem[] {
    const items = [
      new vscode.CompletionItem("props", vscode.CompletionItemKind.Property),
      new vscode.CompletionItem("hydrate", vscode.CompletionItemKind.Property),
    ];

    items.forEach((i) => {
      i.insertText = new vscode.SnippetString(`${i.label}: $1`);
    });

    return items;
  }

  /**
   * Provide hydrate values for the island
   */

  private provideHydrateValueCompletions(): vscode.CompletionItem[] {
    const values = [
      { value: "eager", description: "Hydrate immediately on page load" },
      { value: "lazy", description: "Hydrate when browser is idle (default)" },
      { value: "idle", description: "Hydrate when element becomes visible in viewport" }
    ];
    return values.map(({ value, description }) => {
      const item = new vscode.CompletionItem(
        value,
        vscode.CompletionItemKind.EnumMember
      );
      item.insertText = value;
      item.documentation = new vscode.MarkdownString(description);
      return item;
    });
  }

  /**
   * Provide hover information (optional future enhancement)
   */
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) {
      return undefined;
    }

    const word = document.getText(range);
    const lineText = document.lineAt(position).text;

    // Check if hovering over a component name in island tag
    const islandMatch = lineText.match(/\{%\s*island\s+["']([^"']+)["']/);
    if (islandMatch && islandMatch[1] === word) {
      try {
        const metadata = await this.kvClient.getComponentMetadata(word);
        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`### ${metadata.name}\n\n`);
        markdown.appendMarkdown(`${metadata.description}\n\n`);

        if (metadata.props && Object.keys(metadata.props).length > 0) {
          markdown.appendMarkdown("**Props:**\n\n");
          Object.entries(metadata.props).forEach(([name, def]) => {
            const req = def.required ? "_(required)_" : "_(optional)_";
            markdown.appendMarkdown(
              `- **${name}** \`${def.type}\` ${req}: ${def.description}\n`
            );
          });
        }

        return new vscode.Hover(markdown);
      } catch (error) {
        return undefined;
      }
    }

    return undefined;
  }
}
