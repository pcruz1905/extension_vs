import type { LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node.js';
import * as vscode from 'vscode';
import * as path from 'node:path';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node.js';

let client: LanguageClient;

// This function is called when the extension is activated.
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    client = await startLanguageClient(context);

    // Register custom commands
    registerCommands(context, client);
}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (client) {
        return client.stop();
    }
    return undefined;
}

async function startLanguageClient(context: vscode.ExtensionContext): Promise<LanguageClient> {
    const serverModule = context.asAbsolutePath(path.join('out', 'language', 'main.cjs'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: '*', language: 'sellhub-liquid' }]
    };

    // Create the language client and start the client.
    const client = new LanguageClient(
        'sellhub-liquid',
        'sellhub liquid',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    await client.start();
    return client;
}

interface CommandResult {
    success: boolean;
    message: string;
    componentCount?: number;
    stats?: {
        manifestCached: boolean;
        metadataEntriesCached: number;
    };
}

function registerCommands(context: vscode.ExtensionContext, client: LanguageClient): void {
    // Refresh cache command
    context.subscriptions.push(
        vscode.commands.registerCommand('sellhubb.refreshCache', async () => {
            try {
                const result = await client.sendRequest<CommandResult>('sellhubb/refreshCache');
                if (result.success) {
                    vscode.window.showInformationMessage(result.message);
                } else {
                    vscode.window.showErrorMessage(result.message);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to refresh cache: ${errorMessage}`);
            }
        })
    );

    // Sync components command
    context.subscriptions.push(
        vscode.commands.registerCommand('sellhubb.syncComponents', async () => {
            try {
                vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Syncing components from R2...',
                        cancellable: false
                    },
                    async () => {
                        const result = await client.sendRequest<CommandResult>('sellhubb/syncComponents');
                        if (result.success) {
                            vscode.window.showInformationMessage(result.message);
                        } else {
                            vscode.window.showErrorMessage(result.message);
                        }
                    }
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to sync components: ${errorMessage}`);
            }
        })
    );

    // Show cache stats command
    context.subscriptions.push(
        vscode.commands.registerCommand('sellhubb.showCacheStats', async () => {
            try {
                const result = await client.sendRequest<CommandResult>('sellhubb/showCacheStats');
                if (result.success && result.stats) {
                    const manifestStatus = result.stats.manifestCached ? 'Cached' : 'Not cached';
                    const message = `Cache Status:\n- Manifest: ${manifestStatus}\n- Metadata entries: ${result.stats.metadataEntriesCached}`;
                    vscode.window.showInformationMessage(message);
                } else {
                    vscode.window.showErrorMessage(result.message || 'Failed to get cache stats');
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to get cache stats: ${errorMessage}`);
            }
        })
    );

    // Test connection command
    context.subscriptions.push(
        vscode.commands.registerCommand('sellhubb.testConnection', async () => {
            try {
                vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Testing R2 connection...',
                        cancellable: false
                    },
                    async () => {
                        const result = await client.sendRequest<CommandResult>('sellhubb/testConnection');
                        if (result.success) {
                            vscode.window.showInformationMessage(result.message);
                        } else {
                            vscode.window.showErrorMessage(result.message);
                        }
                    }
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to test connection: ${errorMessage}`);
            }
        })
    );
}
