/**
 * IslandsCodeActionProvider - Provides quick fixes for Islands validation errors
 *
 * Provides code actions (quick fixes) for common validation errors:
 * - Unknown component → "Sync components from R2"
 * - Missing required prop → "Add required prop 'propName'"
 * - Invalid hydrate value → "Change to 'eager' / 'lazy' / 'idle'"
 */

import { CodeAction, CodeActionKind, Command, Diagnostic, TextEdit } from 'vscode-languageserver-protocol';
import { CodeActionProvider } from 'langium/lsp';
import { CancellationToken, CodeActionParams } from 'vscode-languageserver';
import { LangiumDocument } from 'langium';
import { MaybePromise } from 'langium';
import { R2Client } from '../services/r2-client.js';

export class IslandsCodeActionProvider implements CodeActionProvider {
    // R2Client may be needed in the future for fetching component metadata
    // to provide more intelligent quick fixes
    constructor(_r2Client: R2Client) {
        // Reserved for future use
    }

    getCodeActions(
        document: LangiumDocument,
        params: CodeActionParams,
        _cancelToken?: CancellationToken
    ): MaybePromise<Array<Command | CodeAction>> {
        const result: CodeAction[] = [];
        const diagnostics = params.context.diagnostics;

        for (const diagnostic of diagnostics) {
            // Quick fix for unknown component
            if (diagnostic.message.includes('Unknown component')) {
                result.push(this.createSyncComponentsAction(diagnostic));
            }

            // Quick fix for missing required prop
            if (diagnostic.message.includes('Missing required prop')) {
                const propName = this.extractPropName(diagnostic.message);
                if (propName) {
                    result.push(this.createAddRequiredPropAction(document, diagnostic, propName));
                }
            }

            // Quick fix for invalid hydrate value
            if (diagnostic.message.includes('Invalid hydration strategy')) {
                result.push(...this.createChangeHydrateActions(document, diagnostic));
            }
        }

        return result;
    }

    /**
     * Create "Sync components from R2" action
     */
    private createSyncComponentsAction(diagnostic: Diagnostic): CodeAction {
        return {
            title: '💡 Sync components from R2',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            command: {
                title: 'Sync Components',
                command: 'sellhubb.syncComponents',
                arguments: []
            }
        };
    }

    /**
     * Create "Add required prop" action
     */
    private createAddRequiredPropAction(
        document: LangiumDocument,
        diagnostic: Diagnostic,
        propName: string
    ): CodeAction {
        const range = diagnostic.range;

        // Find the props object in the island tag
        const line = document.textDocument.getText({
            start: { line: range.start.line, character: 0 },
            end: { line: range.end.line, character: 1000 }
        });

        let edit: TextEdit | undefined;

        // Check if props object exists
        if (line.includes('props:')) {
            // Props object exists, add the prop inside it
            const propsMatch = line.match(/props:\s*\{([^}]*)\}/);
            if (propsMatch) {
                const propsContent = propsMatch[1].trim();
                const insertPosition = line.indexOf('{', line.indexOf('props:')) + 1;

                if (propsContent.length > 0) {
                    // Add comma after existing props
                    edit = {
                        range: {
                            start: { line: range.start.line, character: insertPosition },
                            end: { line: range.start.line, character: insertPosition }
                        },
                        newText: ` ${propName}: `
                    };
                } else {
                    // First prop
                    edit = {
                        range: {
                            start: { line: range.start.line, character: insertPosition },
                            end: { line: range.start.line, character: insertPosition }
                        },
                        newText: ` ${propName}: `
                    };
                }
            }
        } else {
            // No props object, need to add it
            // Find the component name end quote
            const componentMatch = line.match(/{% island ["']([^"']+)["']/);
            if (componentMatch) {
                const componentNameEnd = line.indexOf(componentMatch[0]) + componentMatch[0].length;
                edit = {
                    range: {
                        start: { line: range.start.line, character: componentNameEnd },
                        end: { line: range.start.line, character: componentNameEnd }
                    },
                    newText: `, props: { ${propName}:  }`
                };
            }
        }

        if (!edit) {
            // Fallback - just show a message
            return {
                title: `💡 Add required prop '${propName}'`,
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
            };
        }

        return {
            title: `💡 Add required prop '${propName}'`,
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            edit: {
                changes: {
                    [document.uri.toString()]: [edit]
                }
            }
        };
    }

    /**
     * Create "Change to X" actions for hydrate values
     */
    private createChangeHydrateActions(
        document: LangiumDocument,
        diagnostic: Diagnostic
    ): CodeAction[] {
        const validStrategies = ['eager', 'lazy', 'idle'];
        const actions: CodeAction[] = [];

        const line = document.textDocument.getText({
            start: { line: diagnostic.range.start.line, character: 0 },
            end: { line: diagnostic.range.end.line, character: 1000 }
        });

        // Find the hydrate value position
        const hydrateMatch = line.match(/hydrate:\s*["']([^"']*)["']/);
        if (!hydrateMatch) {
            return actions;
        }

        const currentValue = hydrateMatch[1];
        const valueStart = line.indexOf(hydrateMatch[1], line.indexOf('hydrate:'));

        for (const strategy of validStrategies) {
            if (strategy !== currentValue) {
                actions.push({
                    title: `💡 Change to '${strategy}'`,
                    kind: CodeActionKind.QuickFix,
                    diagnostics: [diagnostic],
                    edit: {
                        changes: {
                            [document.uri.toString()]: [{
                                range: {
                                    start: { line: diagnostic.range.start.line, character: valueStart },
                                    end: { line: diagnostic.range.start.line, character: valueStart + currentValue.length }
                                },
                                newText: strategy
                            }]
                        }
                    }
                });
            }
        }

        return actions;
    }

    /**
     * Extract prop name from error message
     */
    private extractPropName(message: string): string | null {
        const match = message.match(/Missing required prop "([^"]+)"/);
        return match ? match[1] : null;
    }
}
