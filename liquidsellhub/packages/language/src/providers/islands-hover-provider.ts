/**
 * IslandsHoverProvider - Provides hover documentation for Islands components
 * Ported from extension_vs/src/liquidCompletion.ts (provideHover method)
 */

import { AstNode, AstUtils, LangiumDocument } from 'langium';
import { Hover, HoverParams } from 'vscode-languageserver-protocol';
import { IslandTag } from '../generated/ast.js';
import { R2Client } from '../services/r2-client.js';

export class IslandsHoverProvider {
    private r2Client: R2Client;

    constructor(r2Client: R2Client) {
        this.r2Client = r2Client;
    }

    /**
     * Provide hover information for Islands components
     */
    async getHoverContent(document: LangiumDocument, params: HoverParams): Promise<Hover | undefined> {
        const offset = document.textDocument.offsetAt(params.position);
        const rootNode = document.parseResult.value;

        // Find the AST node at the cursor position
        const astNode = this.findNodeAtOffset(rootNode, offset);

        if (!astNode) {
            return undefined;
        }

        // Check if we're hovering over an IslandTag
        if (this.isIslandTag(astNode)) {
            return await this.provideIslandHover(astNode as IslandTag);
        }

        return undefined;
    }

    /**
     * Find AST node at given offset
     */
    private findNodeAtOffset(node: AstNode, offset: number): AstNode | undefined {
        const cstNode = node.$cstNode;

        if (!cstNode) {
            return undefined;
        }

        if (cstNode.offset <= offset && cstNode.end >= offset) {
            // Check children first for more specific matches
            for (const child of AstUtils.streamAllContents(node)) {
                const childNode = this.findNodeAtOffset(child, offset);
                if (childNode) {
                    return childNode;
                }
            }

            return node;
        }

        return undefined;
    }

    /**
     * Check if node is an IslandTag
     */
    private isIslandTag(node: AstNode): boolean {
        return node.$type === 'IslandTag';
    }

    /**
     * Provide hover content for an Island component
     */
    private async provideIslandHover(islandTag: IslandTag): Promise<Hover | undefined> {
        // Extract component name from the island tag
        const componentName = this.extractComponentName(islandTag);

        if (!componentName) {
            return undefined;
        }

        try {
            const metadata = await this.r2Client.getComponentMetadata(componentName);

            if (!metadata) {
                return {
                    contents: {
                        kind: 'markdown',
                        value: `**${componentName}**\n\nIsland component (no metadata available)`
                    }
                };
            }

            // Generate markdown documentation
            const documentation = this.generateDocumentation(metadata);

            return {
                contents: {
                    kind: 'markdown',
                    value: documentation
                }
            };
        } catch (error) {
            console.error('IslandsHoverProvider: Error fetching metadata:', error);
            return undefined;
        }
    }

    /**
     * Extract component name from IslandTag node
     */
    private extractComponentName(islandTag: IslandTag): string | null {
        // The name property can be either a STRING or ID
        const name = islandTag.name;

        if (typeof name === 'string') {
            // Remove quotes if present
            return name.replace(/^["']|["']$/g, '');
        }

        return null;
    }

    /**
     * Generate markdown documentation for a component
     */
    private generateDocumentation(metadata: any): string {
        let doc = `**${metadata.name}**\n\n`;

        if (metadata.description) {
            doc += `${metadata.description}\n\n`;
        }

        doc += `---\n\n**Props:**\n\n`;

        const props = metadata.props || {};
        const propEntries = Object.entries(props);

        if (propEntries.length === 0) {
            doc += '*No props defined*\n';
        } else {
            for (const [propName, propDef] of propEntries) {
                const typedPropDef = propDef as any;
                const required = typedPropDef.required ? '**required**' : '*optional*';
                const typeInfo = typedPropDef.type || 'any';

                doc += `- \`${propName}\` (\`${typeInfo}\`) - ${required}\n`;

                if (typedPropDef.description) {
                    doc += `  ${typedPropDef.description}\n`;
                }

                doc += `\n`;
            }
        }

        return doc;
    }
}
