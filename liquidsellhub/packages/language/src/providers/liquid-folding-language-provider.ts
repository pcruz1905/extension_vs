/**
 * LiquidFoldingRangeProvider - Provides code folding for Liquid block tags
 *
 */

import { AstNode } from 'langium';
import { FoldingRangeProvider } from 'langium/lsp';
import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver-protocol';
import { LangiumDocument } from 'langium';
import * as ast from '../generated/ast.js';

export class LiquidFoldingRangeProvider implements FoldingRangeProvider {
    getFoldingRanges(document: LangiumDocument): FoldingRange[] {
        const ranges: FoldingRange[] = [];
        const root = document.parseResult.value;

        this.collectFoldingRanges(root, ranges, document);

        return ranges;
    }

    private collectFoldingRanges(node: AstNode, ranges: FoldingRange[], document: LangiumDocument): void {
        // idk chat did this part
        if (ast.isIslandTag(node)) {
            this.addFoldingRange(node, ranges, document);
        } else if (ast.isForTag(node)) {
            this.addFoldingRange(node, ranges, document);
        } else if (ast.isIfTag(node)) {
            this.addFoldingRange(node, ranges, document);
        } else if (ast.isCaseTag(node)) {
            this.addFoldingRange(node, ranges, document);
        } else if (ast.isUnlessTag(node)) {
            this.addFoldingRange(node, ranges, document);
        } else if (ast.isCaptureTag(node)) {
            this.addFoldingRange(node, ranges, document);
        } else if (ast.isCommentTag(node)) {
            this.addFoldingRange(node, ranges, document, FoldingRangeKind.Comment);
        } else if (ast.isRawTag(node)) {
            this.addFoldingRange(node, ranges, document);
        } else if (ast.isTableRowTag(node)) {
            this.addFoldingRange(node, ranges, document);
        }


        const children = this.getChildren(node);
        for (const child of children) {
            this.collectFoldingRanges(child, ranges, document);
        }
    }

    private addFoldingRange(
        node: AstNode,
        ranges: FoldingRange[],
        document: LangiumDocument,
        kind?: FoldingRangeKind
    ): void {
        const cstNode = node.$cstNode;
        if (!cstNode) {
            return;
        }


        const text = cstNode.text;

        
        const openingEnd = text.indexOf('%}');
        if (openingEnd === -1) {
            return;
        }

        
        const closingStart = text.lastIndexOf('{%');
        if (closingStart === -1 || closingStart <= openingEnd) {
            return;
        }

        
        const startOffset = cstNode.offset + openingEnd + 2; // After %}
        const endOffset = cstNode.offset + closingStart - 1; // Before {%

        const startPos = document.textDocument.positionAt(startOffset);
        const endPos = document.textDocument.positionAt(endOffset);

        
        if (endPos.line > startPos.line) {
            ranges.push({
                startLine: startPos.line,
                startCharacter: startPos.character,
                endLine: endPos.line,
                endCharacter: endPos.character,
                kind: kind
            });
        }
    }

    private getChildren(node: AstNode): AstNode[] {
        const children: AstNode[] = [];

        
        for (const key in node) {
            if (key.startsWith('$')) {
                continue; 
            }

            const value = (node as any)[key];

            
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (item && typeof item === 'object' && '$type' in item) {
                        children.push(item as AstNode);
                    }
                }
            }
          
            else if (value && typeof value === 'object' && '$type' in value) {
                children.push(value as AstNode);
            }
        }

        return children;
    }
}