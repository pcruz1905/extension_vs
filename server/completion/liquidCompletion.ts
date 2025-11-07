import type { R2Client } from "../r2/r2Client";
import {
  Position,
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
  Hover,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

const ISLAND_PATTERN_REGEX =
  /\{[{%]\s*island(?:\s+["']?([^"'%}\s]*)["']?)?(?:\s*,\s*props\s*:\s*(\{[\s\S]*?)?)?\s*(?:[}%]\}|$)?/;

/**
 * Completion provider for Sellhubb Liquid components
 */
export class LiquidCompletionProvider {
  constructor(private r2Client: R2Client) {}

  async provideCompletionItems(
    document: TextDocument,
    position: Position
  ): Promise<CompletionItem[]> {
    const lineText = document.getText({
      start: { line: position.line, character: 0 },
      end: { line: position.line, character: Number.MAX_VALUE },
    });

    const textBeforeCursor = lineText.substring(0, position.character);

    // Check if we're inside an island tag
    if (this.isIslandTagContext(textBeforeCursor)) {
      const componentName = this.getComponentNameInScope(document, position);

      // If we have a component name and are inside props
      if (componentName && this.isPropsContext(textBeforeCursor)) {
        return await this.providePropsCompletions(componentName);
      }

      if (this.isHydrateValueContext(textBeforeCursor)) {
        return this.provideHydrateValueCompletions();
      }

      if (this.isIslandValueContext(textBeforeCursor)) {
        return await this.provideComponentNameCompletions(document, position);
      }

      // Otherwise, provide island top level completion
      return this.provideIslandTopLevelCompletions(document);
    }

    return this.provideIslandSyntaxCompletion(textBeforeCursor);
  }

  /**
   * Check if cursor is inside an island tag: {% island "..." or {{ island "..."
   */
  private isIslandTagContext(textBeforeCursor: string): boolean {
    const match = textBeforeCursor.match(ISLAND_PATTERN_REGEX);
    return !!match;
  }

  private provideIslandSyntaxCompletion(
    textBeforeCursor: string
  ): CompletionItem[] {
    const islandItem: CompletionItem = {
      label: "island",
      kind: CompletionItemKind.Snippet,
      detail: "Insert island snippet",
      data: { type: "island-snippet" },
    };

    const INSIDE_LIQUID_REGEX = /\{[{%][^}%]*$/;

    if (textBeforeCursor.match(INSIDE_LIQUID_REGEX)) {
      islandItem.insertText = 'island "$1"';
      islandItem.insertTextFormat = InsertTextFormat.Snippet;
    } else {
      islandItem.insertText = '{{ island "$1" }}';
      islandItem.insertTextFormat = InsertTextFormat.Snippet;
    }

    return [islandItem];
  }

  /**
   * Check if cursor is inside a props object: props: { ...
   */
  private isPropsContext(textBeforeCursor: string): boolean {
    const propsPattern = /props\s*:\s*\{/;
    const match = textBeforeCursor.match(propsPattern);

    if (!match) {
      return false;
    }

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
    document: TextDocument,
    position: Position
  ): string | null {
    for (let i = position.line; i >= Math.max(0, position.line - 20); i--) {
      const lineText = document.getText({
        start: { line: i, character: 0 },
        end: { line: i, character: Number.MAX_VALUE },
      });

      const match = lineText.match(ISLAND_PATTERN_REGEX);
      if (match && match[1]) {
        return match[1];
      }

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
    document: TextDocument,
    position: Position
  ): Promise<CompletionItem[]> {
    try {
      const manifest = await this.r2Client.getComponentManifest();

      const lineText = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: Number.MAX_VALUE },
      });
      const textBeforeCursor = lineText.substring(0, position.character);

      // More accurate quote detection
      const hasOpeningQuote = textBeforeCursor.includes('"');
      const lastQuoteIndex = textBeforeCursor.lastIndexOf('"');
      const textAfterLastQuote = textBeforeCursor.substring(lastQuoteIndex + 1);
      const hasClosingQuote = textAfterLastQuote.includes('"');

      const isInsideQuotes = hasOpeningQuote && !hasClosingQuote;

      const items = await Promise.all(
        manifest.components.map(async (componentName: string) => {
          const item: CompletionItem = {
            label: componentName,
            kind: CompletionItemKind.Class,
            detail: "Sellhubb Component",
            sortText: `0_${componentName}`,
            data: { type: "component-name" },
          };

          try {
            const metadata = await this.r2Client.getComponentMetadata(
              componentName
            );
            const requiredProps = metadata.props
              ? Object.entries(metadata.props)
                  .filter(([_, def]: [string, any]) => def.required)
                  .map(([name]) => name)
              : [];

            // Build snippet parts
            const snippetParts: string[] = [];

            // Component name (handle quotes correctly)
            if (isInsideQuotes) {
              snippetParts.push(componentName);
            } else {
              snippetParts.push(`"${componentName}"`);
            }

            // Props (no placeholders)
            if (requiredProps.length > 0) {
              const propsSnippet = requiredProps
                .map((p) => `${p}: `)
                .join(", ");
              snippetParts.push(`props: { ${propsSnippet} }`);
            } else if (
              metadata.props &&
              Object.keys(metadata.props).length > 0
            ) {
              snippetParts.push(`props: { }`);
            }

            // Hydrate
            snippetParts.push(`hydrate: "\${1|eager,lazy,idle|}"`);

            const snippet = snippetParts.join(", ");

            item.insertText = snippet;
            item.insertTextFormat = InsertTextFormat.Snippet;

            // ✅ FIXED: Properly replace what's inside the quotes
            if (isInsideQuotes) {
              const startIndex = lastQuoteIndex + 1;
              const textAfterQuote = lineText.substring(startIndex);
              const nextQuoteIndex = textAfterQuote.indexOf('"');
              const endIndex =
                nextQuoteIndex !== -1
                  ? startIndex + nextQuoteIndex
                  : position.character;

              item.textEdit = {
                range: {
                  start: { line: position.line, character: startIndex },
                  end: { line: position.line, character: endIndex },
                },
                newText: snippet,
              };
            }

            if (metadata.description) {
              item.documentation = {
                kind: MarkupKind.Markdown,
                value: this.generateComponentDocumentation(metadata),
              };
            }
          } catch (error) {
            const fallbackSnippet = isInsideQuotes
              ? `${componentName}, props: { }, hydrate: "\${1|eager,lazy,idle|}"`
              : `"${componentName}", props: { }, hydrate: "\${1|eager,lazy,idle|}"`;

            item.insertText = fallbackSnippet;
            item.insertTextFormat = InsertTextFormat.Snippet;
          }

          return item;
        })
      );

      return items;
    } catch (error) {
      console.error("Failed to fetch component manifest:", error);
      return [];
    }
  }

  private generateComponentDocumentation(metadata: any): string {
    let doc = `${metadata.description || "No description available"}\n\n`;

    if (metadata.props && Object.keys(metadata.props).length > 0) {
      doc += "### Props\n\n";
      Object.entries(metadata.props).forEach(([name, def]: [string, any]) => {
        const required = def.required ? "**Required**" : "Optional";
        doc += `- **${name}** (\`${def.type}\`) - ${required}\n`;
        if (def.description) {
          doc += `  - ${def.description}\n`;
        }
        if (def.defaultValue !== undefined) {
          doc += `  - Default: \`${JSON.stringify(def.defaultValue)}\`\n`;
        }
      });
    }

    return doc;
  }

  /**
   * Provide completions for component props
   */
  private async providePropsCompletions(
    componentName: string
  ): Promise<CompletionItem[]> {
    try {
      const metadata = await this.r2Client.getComponentMetadata(componentName);

      if (!metadata.props || Object.keys(metadata.props).length === 0) {
        return [];
      }

      return Object.entries(metadata.props).map(
        ([propName, propDef]: [string, any]) => {
          const item: CompletionItem = {
            label: propName,
            kind: CompletionItemKind.Property,
            data: { type: "component-prop", component: componentName },
          };

          const requiredLabel = propDef.required ? "required" : "optional";
          item.detail = `${propDef.type} (${requiredLabel})`;

          let documentation = `**${propName}** \`${propDef.type}\`\n\n`;
          if (propDef.description) {
            documentation += propDef.description;
          }
          if (propDef.required) {
            documentation += "\n\n_Required_";
          }
          if (propDef.defaultValue !== undefined) {
            documentation += `\n\n**Default:** \`${JSON.stringify(
              propDef.defaultValue
            )}\``;
          }

          item.documentation = {
            kind: MarkupKind.Markdown,
            value: documentation,
          };

          item.insertText = this.generatePropInsertSnippet(propName, propDef);
          item.insertTextFormat = InsertTextFormat.Snippet;

          item.sortText = propDef.required ? `0_${propName}` : `1_${propName}`;

          return item;
        }
      );
    } catch (error) {
      console.error(`Failed to fetch metadata for ${componentName}:`, error);
      return [];
    }
  }

  private generatePropInsertSnippet(propName: string, propDef: any): string {
    const defaultValue = this.getSmartDefaultValue(propDef);

    switch (propDef.type) {
      case "string":
        return `${propName}: "${defaultValue}"`;
      case "number":
        return `${propName}: ${defaultValue}`;
      case "boolean":
        return `${propName}: ${defaultValue}`;
      case "array":
        return `${propName}: [${defaultValue}]`;
      case "object":
        return `${propName}: {${defaultValue}}`;
      default:
        return `${propName}: ${defaultValue}`;
    }
  }

  private getSmartDefaultValue(propDef: any): string {
    if (propDef.defaultValue !== undefined) {
      if (propDef.type === "string") {
        return propDef.defaultValue;
      }
      return JSON.stringify(propDef.defaultValue);
    }

    switch (propDef.type) {
      case "string":
        return `\${1:value}`;
      case "number":
        return `\${1:0}`;
      case "boolean":
        return `\${1|true,false|}`;
      case "array":
        return `\${1:item}`;
      case "object":
        return `\${1:key: value}`;
      default:
        return `\${1:value}`;
    }
  }

  private isHydrateValueContext(text: string): boolean {
    return /hydrate:\s*"[^"]*$/.test(text);
  }

  private isIslandValueContext(text: string): boolean {
    return /island\s+"[^"]*$/.test(text);
  }

  /**
   * Provide island top level completions
   */
  private provideIslandTopLevelCompletions(
    document: TextDocument
  ): CompletionItem[] {
    const text = document.getText();

    const allItems: CompletionItem[] = [
      {
        label: "props",
        kind: CompletionItemKind.Property,
        detail: "Component properties",
        data: { type: "island-option" },
      },
      {
        label: "hydrate",
        kind: CompletionItemKind.Property,
        detail: "Hydration strategy",
        data: { type: "island-option" },
      },
    ];

    const items = allItems.filter((item) => !text.includes(`${item.label}:`));

    items.forEach((item) => {
      if (item.label === "props") {
        item.insertText = `${item.label}: {$1}`;
        item.insertTextFormat = InsertTextFormat.Snippet;
        item.documentation = {
          kind: MarkupKind.Markdown,
          value:
            'Component properties object\n\n**Example:**\n```liquid\nprops: { title: "Hello", count: 5 }\n```',
        };
      } else {
        item.insertText = `${item.label}: "$1"`;
        item.insertTextFormat = InsertTextFormat.Snippet;
        item.documentation = {
          kind: MarkupKind.Markdown,
          value:
            "Hydration strategy for the island component\n\n**Options:**\n- `eager` - Hydrate immediately\n- `lazy` - Hydrate when browser is idle\n- `idle` - Hydrate when visible",
        };
      }
    });

    return items;
  }

  /**
   * Provide hydrate values for the island
   */
  private provideHydrateValueCompletions(): CompletionItem[] {
    const values = [
      {
        value: "eager",
        description: "Hydrate immediately on page load",
        detail: "Immediate hydration",
      },
      {
        value: "lazy",
        description: "Hydrate when browser is idle (default)",
        detail: "Idle hydration (default)",
      },
      {
        value: "idle",
        description: "Hydrate when element becomes visible in viewport",
        detail: "Visible hydration",
      },
    ];

    return values.map(({ value, description, detail }) => {
      const item: CompletionItem = {
        label: value,
        kind: CompletionItemKind.EnumMember,
        detail: detail,
        insertText: value,
        documentation: {
          kind: MarkupKind.Markdown,
          value: description,
        },
        data: { type: "hydrate-value" },
      };
      return item;
    });
  }

  /**
   * Provide hover information
   */
  async provideHover(
    document: TextDocument,
    position: Position
  ): Promise<Hover | null> {
    const range = this.getWordRangeAtPosition(document, position);
    if (!range) {
      return null;
    }

    const word = document.getText(range);
    const lineText = document.getText({
      start: { line: position.line, character: 0 },
      end: { line: position.line, character: Number.MAX_VALUE },
    });

    const islandMatch = lineText.match(/\{%\s*island\s+["']([^"']+)["']/);
    if (islandMatch && islandMatch[1] === word) {
      try {
        const metadata = await this.r2Client.getComponentMetadata(word);
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: this.generateComponentDocumentation(metadata),
          },
          range: range,
        };
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  private getWordRangeAtPosition(document: TextDocument, position: Position) {
    const line = document.getText({
      start: { line: position.line, character: 0 },
      end: { line: position.line, character: Number.MAX_VALUE },
    });

    let start = position.character;
    let end = position.character;

    while (start > 0 && /[\w$]/.test(line[start - 1])) start--;
    while (end < line.length && /[\w$]/.test(line[end])) end++;

    if (start === end) return null;

    return {
      start: { line: position.line, character: start },
      end: { line: position.line, character: end },
    };
  }
}
