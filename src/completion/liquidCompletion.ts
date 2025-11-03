import * as vscode from "vscode";
import { KVClient } from "../kv/kvClient";
import type { ComponentMetadata } from "../types";

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
        ...(await this.provideComponentNameCompletions()),
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
   * Provide completions for component names
   */
  private async provideComponentNameCompletions(): Promise<
    vscode.CompletionItem[]
  > {
    try {
      const manifest = await this.kvClient.getComponentManifest();

      return manifest.components.map((componentName) => {
        const item = new vscode.CompletionItem(
          componentName,
          vscode.CompletionItemKind.Class
        );
        item.detail = "Sellhubb Component";
        item.insertText = componentName;
        item.sortText = `0_${componentName}`; // Sort alphabetically with priority

        // Try to fetch metadata for documentation (non-blocking)
        this.enrichComponentItem(item, componentName);

        return item;
      });
    } catch (error) {
      console.error("Failed to fetch component manifest:", error);
      return [];
    }
  }

  /**
   * Enrich completion item with metadata (async, non-blocking)
   */
  private async enrichComponentItem(
    item: vscode.CompletionItem,
    componentName: string
  ): Promise<void> {
    try {
      const metadata = await this.kvClient.getComponentMetadata(componentName);
      if (metadata.description) {
        item.documentation = new vscode.MarkdownString(metadata.description);
      }
    } catch (error) {
      // Silently fail - metadata is optional
    }
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
    const values = ["load", "idle", "visible", "lazy"];
    return values.map((v) => {
      const item = new vscode.CompletionItem(
        v,
        vscode.CompletionItemKind.EnumMember
      );
      item.insertText = v;
      item.documentation = new vscode.MarkdownString(
        `Hydrate the island with **${v}** strategy.`
      );
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
