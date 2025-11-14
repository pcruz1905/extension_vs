/**
 * IslandsCompletionProvider - Provides completions for Islands components
 * Ported from extension_vs/src/liquidCompletion.ts
 */

import { CompletionAcceptor, CompletionContext, CompletionValueItem, DefaultCompletionProvider, NextFeature, LangiumServices } from 'langium/lsp';
import { R2Client } from '../services/r2-client.js';
import { ContextCompletionProvider } from './context-completion-provider.js';

export class IslandsCompletionProvider extends DefaultCompletionProvider {
    private r2Client: R2Client;
    private contextCompletionProvider: ContextCompletionProvider;

    constructor(services: LangiumServices, r2Client: R2Client, contextCompletionProvider: ContextCompletionProvider) {
        super(services);
        this.r2Client = r2Client;
        this.contextCompletionProvider = contextCompletionProvider;
    }

    protected override async completionFor(
        context: CompletionContext,
        next: NextFeature,
        acceptor: CompletionAcceptor
    ): Promise<void> {
        // Call the default completion provider first
        await super.completionFor(context, next, acceptor);

        const textBeforeCursor = context.textDocument.getText({
            start: { line: 0, character: 0 },
            end: context.position
        });

        const document = context.document;
        const offset = document.textDocument.offsetAt(context.position);
        const text = document.textDocument.getText();

        // Get current line for better context detection
        const currentLine = context.textDocument.getText({
            start: { line: context.position.line, character: 0 },
            end: context.position
        });

        // Check if we're in an island tag context
        if (this.isInIslandTagContext(textBeforeCursor, currentLine)) {
            await this.provideIslandCompletions(context, textBeforeCursor, acceptor);
        }

        // Check if we're in props context
        else if (this.isInPropsContext(textBeforeCursor)) {
            await this.providePropsCompletions(context, textBeforeCursor, acceptor, text, offset);
        }

        // Check if we're in hydrate context
        else if (this.isInHydrateContext(textBeforeCursor)) {
            this.provideHydrateCompletions(context, acceptor);
        }

        // Provide Liquid object completions (product., shop., collection., etc.)
        // This runs alongside other completions to support object property access
        await this.contextCompletionProvider.provideCompletions(context, acceptor);
    }

    /**
     * Check if cursor is in island tag context (right after {% island)
     * Matches:
     *   - {% island "
     *   - {% island '
     *   - {% island "" (cursor between quotes)
     *   - {% island "" %} (cursor between quotes, tag already closed)
     *   - {% island "sit" (cursor inside partial name)
     *   - {% island (with space, waiting for component name)
     *   - {%  island  " (extra whitespace)
     */
    private isInIslandTagContext(textBeforeCursor: string, currentLine?: string): boolean {
        // Pattern 1: Match {% island " or {% island ' (right after opening quote)
        const afterOpenQuotePattern = /\{%\s*island\s+["']$/;

        // Pattern 2: Match {% island (with space, before any quote)
        const beforeQuotePattern = /\{%\s*island\s+$/;

        // Pattern 3: Match when cursor is inside quotes: {% island "sit
        const insideQuotesPattern = /\{%\s*island\s+["'][^"']*$/;

        // Pattern 4: Match {% island "" with cursor between empty quotes
        // This handles when user types {% island "" and cursor is between quotes
        const betweenQuotesPattern = /\{%\s*island\s+["']$/;

        // Pattern 5: Check current line for {% island context (even if there's text after cursor)
        const linePattern = currentLine ? /\{%\s*island\s+["']?/.test(currentLine) : false;

        // Pattern 6: Check if we're anywhere inside an island tag definition before the first comma or %}
        const beforeCommaOrEndPattern = /\{%\s*island\s+[^,%]*$/;

        return afterOpenQuotePattern.test(textBeforeCursor) ||
               beforeQuotePattern.test(textBeforeCursor) ||
               insideQuotesPattern.test(textBeforeCursor) ||
               betweenQuotesPattern.test(textBeforeCursor) ||
               (linePattern && !textBeforeCursor.includes(',') && !textBeforeCursor.includes('%}')) ||
               beforeCommaOrEndPattern.test(textBeforeCursor);
    }

    /**
     * Check if cursor is in props object context
     */
    private isInPropsContext(textBeforeCursor: string): boolean {
        // Check if we're inside props: { ... }
        const propsPattern = /props\s*:\s*\{[^}]*$/;
        return propsPattern.test(textBeforeCursor);
    }

    /**
     * Check if cursor is in hydrate context
     */
    private isInHydrateContext(textBeforeCursor: string): boolean {
        // Match hydrate: " or hydrate: '
        const hydratePattern = /hydrate\s*:\s*["']?$/;
        return hydratePattern.test(textBeforeCursor);
    }

    /**
     * Provide component name completions
     */
    private async provideIslandCompletions(
        context: CompletionContext,
        textBeforeCursor: string,
        acceptor: CompletionAcceptor
    ): Promise<void> {
        try {
            const manifest = await this.r2Client.getComponentManifest();

            for (const componentName of manifest.components) {
                // Fetch metadata for the component
                const metadata = await this.r2Client.getComponentMetadata(componentName);

                if (metadata) {
                    // Generate props snippet with smart defaults
                    const propsResult = this.generatePropsSnippet(metadata, textBeforeCursor);

                    // Determine if we need to add opening quote
                    const needsOpeningQuote = !textBeforeCursor.match(/["']$/);
                    const openQuote = needsOpeningQuote ? '"' : '';

                    // Build insert text based on whether component has props
                    let insertText: string;
                    if (propsResult.snippet) {
                        // Component has props - use next tabstop for hydrate
                        const hydrateTabstop = propsResult.lastTabstop + 1;
                        insertText = `${openQuote}${componentName}", props: { ${propsResult.snippet} }, hydrate: "\${${hydrateTabstop}|eager,lazy,idle|}" %}\n\t$0\n{% endisland %}`;
                    } else {
                        // Component has no props, just minimal syntax
                        insertText = `${openQuote}${componentName}", hydrate: "\${1|eager,lazy,idle|}" %}\n\t$0\n{% endisland %}`;
                    }

                    const completionItem: CompletionValueItem = {
                        label: componentName,
                        kind: 7, // CompletionItemKind.Class
                        detail: metadata.description || `Island component: ${componentName}`,
                        documentation: {
                            kind: 'markdown',
                            value: this.generateComponentDocumentation(metadata)
                        },
                        insertText: insertText,
                        insertTextFormat: 2, // Snippet format
                        sortText: `0_${componentName}`,
                    };

                    acceptor(context, completionItem);
                } else {
                    // Fallback if no metadata available
                    const needsOpeningQuote = !textBeforeCursor.match(/["']$/);
                    const openQuote = needsOpeningQuote ? '"' : '';

                    const completionItem: CompletionValueItem = {
                        label: componentName,
                        kind: 7,
                        detail: `Island component: ${componentName}`,
                        insertText: `${openQuote}${componentName}" %}\n\t$0\n{% endisland %}`,
                        insertTextFormat: 2, // Snippet format
                        sortText: `1_${componentName}`,
                    };

                    acceptor(context, completionItem);
                }
            }
        } catch (error) {
            console.error('IslandsCompletionProvider: Error providing island completions:', error);
        }
    }

    /**
     * Generate props snippet with smart defaults
     * Returns object with snippet string and last tabstop number used
     */
    private generatePropsSnippet(metadata: any, textBeforeCursor: string): { snippet: string; lastTabstop: number } {
        const props = metadata.props || {};
        const propNames = Object.keys(props);

        if (propNames.length === 0) {
            return { snippet: '', lastTabstop: 0 };
        }

        // Detect loop variable from text before cursor
        const loopVariable = this.detectLoopVariable(textBeforeCursor);

        let tabstop = 1;
        const propSnippets: string[] = [];

        // Sort: required props first
        const sortedProps = propNames.sort((a, b) => {
            const aRequired = props[a].required ? 0 : 1;
            const bRequired = props[b].required ? 0 : 1;
            return aRequired - bRequired;
        });

        for (const propName of sortedProps) {
            const propDef = props[propName];
            const defaultValue = this.getSmartDefault(propName, propDef.type, loopVariable);

            if (propDef.required) {
                propSnippets.push(`${propName}: \${${tabstop}:${defaultValue}}`);
                tabstop++;
            }
        }

        return {
            snippet: propSnippets.join(', '),
            lastTabstop: tabstop - 1 // Return the last tabstop number used
        };
    }

    /**
     * Detect loop variable from Liquid for-loops
     */
    private detectLoopVariable(text: string): string | null {
        // Look backwards for {% for variable in collection %}
        const lines = text.split('\n').slice(-50); // Last 50 lines

        for (let i = lines.length - 1; i >= 0; i--) {
            const forLoopMatch = lines[i].match(
                /\{%\s*for\s+(\w+)\s+in\s+(?:\w+\.)?(products|collections|items|all_products)/
            );

            if (forLoopMatch) {
                return forLoopMatch[1]; // Return the loop variable name
            }
        }

        return null;
    }

    /**
     * Generate smart default values based on prop name and type
     */
    private getSmartDefault(propName: string, propType: string, loopVariable: string | null): string {
        const lowerPropName = propName.toLowerCase();

        // If we have a loop variable, use it intelligently
        if (loopVariable) {
            if (lowerPropName.includes('productid') || lowerPropName === 'id') {
                return `${loopVariable}.id`;
            }
            if (lowerPropName.includes('producttitle') || lowerPropName === 'title') {
                return `${loopVariable}.title`;
            }
            if (lowerPropName.includes('price')) {
                return `${loopVariable}.price`;
            }
            if (lowerPropName.includes('handle')) {
                return `${loopVariable}.handle`;
            }
            if (lowerPropName.includes('image')) {
                return `${loopVariable}.featuredImage`;
            }
        }

        // Fallback to context-aware defaults
        if (lowerPropName.includes('productid')) return 'product.id';
        if (lowerPropName.includes('producttitle')) return 'product.title';
        if (lowerPropName.includes('product')) return 'product';
        if (lowerPropName.includes('price') || lowerPropName.includes('amount')) return 'product.price';
        if (lowerPropName.includes('compareatprice')) return 'product.compareAtPrice';
        if (lowerPropName.includes('handle')) return 'product.handle';
        if (lowerPropName.includes('collection')) return 'collection';

        // Type-based defaults
        switch (propType.toLowerCase()) {
            case 'string':
                return '""';
            case 'number':
                return '0';
            case 'boolean':
                return 'false';
            case 'array':
                return '[]';
            case 'object':
                return '{}';
            default:
                return '""';
        }
    }

    /**
     * Generate component documentation markdown
     */
    private generateComponentDocumentation(metadata: any): string {
        let doc = `**${metadata.name}**\n\n`;
        doc += `${metadata.description}\n\n`;
        doc += `**Props:**\n\n`;

        const props = metadata.props || {};
        for (const [propName, propDef] of Object.entries<any>(props)) {
            const required = propDef.required ? '*(required)*' : '*(optional)*';
            doc += `- \`${propName}\` (${propDef.type}) ${required}: ${propDef.description}\n`;
        }

        return doc;
    }

    /**
     * Provide props completions inside props: { }
     */
    private async providePropsCompletions(
        context: CompletionContext,
        textBeforeCursor: string,
        acceptor: CompletionAcceptor,
        fullText: string,
        offset: number
    ): Promise<void> {
        // Extract component name from the island tag
        const componentNameMatch = textBeforeCursor.match(/\{%\s*island\s+["']([^"']+)["']/);

        if (!componentNameMatch) {
            return;
        }

        const componentName = componentNameMatch[1];

        try {
            const metadata = await this.r2Client.getComponentMetadata(componentName);

            if (!metadata || !metadata.props) {
                return;
            }

            const loopVariable = this.detectLoopVariable(textBeforeCursor);

            // Provide completions for each prop
            for (const [propName, propDef] of Object.entries<any>(metadata.props)) {
                const defaultValue = this.getSmartDefault(propName, propDef.type, loopVariable);

                const completionItem: CompletionValueItem = {
                    label: propName,
                    kind: 10, // CompletionItemKind.Property
                    detail: `${propDef.type}${propDef.required ? ' (required)' : ''}`,
                    documentation: propDef.description,
                    insertText: `${propName}: ${defaultValue}`,
                    sortText: propDef.required ? `0_${propName}` : `1_${propName}`,
                };

                acceptor(context, completionItem);
            }
        } catch (error) {
            console.error('IslandsCompletionProvider: Error providing props completions:', error);
        }
    }

    /**
     * Provide hydration strategy completions
     */
    private provideHydrateCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        const strategies = [
            {
                label: 'eager',
                detail: 'Hydrate immediately',
                documentation: 'Component will hydrate as soon as possible'
            },
            {
                label: 'lazy',
                detail: 'Hydrate when browser is idle (default)',
                documentation: 'Component will hydrate when the browser is idle'
            },
            {
                label: 'idle',
                detail: 'Hydrate when visible in viewport',
                documentation: 'Component will hydrate when it becomes visible in the viewport'
            }
        ];

        for (const strategy of strategies) {
            const completionItem: CompletionValueItem = {
                label: strategy.label,
                kind: 13, // CompletionItemKind.EnumMember
                detail: strategy.detail,
                documentation: strategy.documentation,
                insertText: strategy.label,
            };

            acceptor(context, completionItem);
        }
    }
}
