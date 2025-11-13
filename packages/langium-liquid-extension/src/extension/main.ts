import type { LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node.js';
import * as vscode from 'vscode';
import * as path from 'node:path';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node.js';

let client: LanguageClient;

// This function is called when the extension is activated.
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('='.repeat(80));
    console.log('🚀 [EXTENSION] Sellhub Liquid Extension Activating...');
    console.log('='.repeat(80));

    console.log('🔌 [EXTENSION] Starting Language Client...');
    client = await startLanguageClient(context);
    console.log('✅ [EXTENSION] Language Client started successfully');

    console.log('📝 [EXTENSION] Registering custom commands...');
    // Register custom commands
    registerCommands(context, client);
    console.log('✅ [EXTENSION] Custom commands registered');

    console.log('='.repeat(80));
    console.log('🎉 [EXTENSION] Sellhub Liquid Extension ACTIVATED');
    console.log('='.repeat(80));
}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (client) {
        return client.stop();
    }
    return undefined;
}

async function startLanguageClient(context: vscode.ExtensionContext): Promise<LanguageClient> {
    console.log('🔧 [EXTENSION] startLanguageClient() called');

    const serverModule = context.asAbsolutePath(path.join('out', 'language', 'main.cjs'));
    console.log('📂 [EXTENSION] Server module path:', serverModule);

    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };
    console.log('🐛 [EXTENSION] Debug options:', debugOptions);

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };
    console.log('⚙️ [EXTENSION] Server options configured');

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: '*', language: 'sellhub-liquid' }]
    };
    console.log('⚙️ [EXTENSION] Client options configured for language: sellhub-liquid');

    console.log('🏗️ [EXTENSION] Creating LanguageClient...');
    // Create the language client and start the client.
    const client = new LanguageClient(
        'sellhub-liquid',
        'sellhub liquid',
        serverOptions,
        clientOptions
    );
    console.log('✅ [EXTENSION] LanguageClient created');

    console.log('▶️ [EXTENSION] Starting client (this will also launch the server)...');
    // Start the client. This will also launch the server
    await client.start();
    console.log('✅ [EXTENSION] Client started successfully!');

    // Send R2 configuration to the LSP server
    console.log('📤 [EXTENSION] Reading R2 configuration from VS Code settings...');
    await sendConfigurationToServer(client);

    return client;
}

async function sendConfigurationToServer(client: LanguageClient): Promise<void> {
    try {
        // Read configuration directly from VS Code settings
        const config = vscode.workspace.getConfiguration('sellhubb');

        const r2AccountId = config.get<string>('r2AccountId', '');
        const r2AccessKeyId = config.get<string>('r2AccessKeyId', '');
        const r2SecretAccessKey = config.get<string>('r2SecretAccessKey', '');
        const r2BucketName = config.get<string>('r2BucketName', '');

        console.log('📊 [EXTENSION] Config read from VS Code settings:');
        console.log('  r2AccountId:', r2AccountId ? `${r2AccountId.substring(0, 8)}...` : 'NOT SET');
        console.log('  r2AccessKeyId:', r2AccessKeyId ? `${r2AccessKeyId.substring(0, 8)}...` : 'NOT SET');
        console.log('  r2SecretAccessKey:', r2SecretAccessKey ? '***PRESENT***' : 'NOT SET');
        console.log('  r2BucketName:', r2BucketName || 'NOT SET');

        console.log('📤 [EXTENSION] Sending configuration to LSP server...');
        await client.sendNotification('sellhubb/updateConfiguration', {
            r2AccountId,
            r2AccessKeyId,
            r2SecretAccessKey,
            r2BucketName
        });
        console.log('✅ [EXTENSION] Configuration sent to LSP server successfully');
    } catch (error) {
        console.error('❌ [EXTENSION] Failed to send configuration to server:', error);
    }
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
    console.log('📝 [EXTENSION] registerCommands() called');

    // Refresh cache command
    console.log('📝 [EXTENSION] Registering command: sellhubb.refreshCache');
    context.subscriptions.push(
        vscode.commands.registerCommand('sellhubb.refreshCache', async () => {
            console.log('📨 [EXTENSION] Command executed: sellhubb.refreshCache');
            try {
                console.log('🌐 [EXTENSION] Sending request to LSP: sellhubb/refreshCache');
                const result = await client.sendRequest<CommandResult>('sellhubb/refreshCache');
                console.log('📨 [EXTENSION] Response received:', result);
                if (result.success) {
                    vscode.window.showInformationMessage(result.message);
                } else {
                    vscode.window.showErrorMessage(result.message);
                }
            } catch (error) {
                console.error('❌ [EXTENSION] Error in sellhubb.refreshCache:', error);
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
    console.log('📝 [EXTENSION] Registering command: sellhubb.testConnection');
    context.subscriptions.push(
        vscode.commands.registerCommand('sellhubb.testConnection', async () => {
            console.log('='.repeat(80));
            console.log('🧪 [EXTENSION] Command executed: sellhubb.testConnection');
            console.log('='.repeat(80));
            try {
                vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Testing R2 connection...',
                        cancellable: false
                    },
                    async () => {
                        console.log('🌐 [EXTENSION] Sending request to LSP: sellhubb/testConnection');
                        const result = await client.sendRequest<CommandResult>('sellhubb/testConnection');
                        console.log('📨 [EXTENSION] Response received from LSP:', result);

                        if (result.success) {
                            console.log('✅ [EXTENSION] Test connection PASSED');
                            vscode.window.showInformationMessage(result.message);
                        } else {
                            console.error('❌ [EXTENSION] Test connection FAILED');
                            vscode.window.showErrorMessage(result.message);
                        }
                        console.log('='.repeat(80));
                    }
                );
            } catch (error) {
                console.error('❌ [EXTENSION] FATAL ERROR in sellhubb.testConnection');
                console.error('❌ [EXTENSION] Error:', error);
                console.log('='.repeat(80));
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to test connection: ${errorMessage}`);
            }
        })
    );

    console.log('✅ [EXTENSION] All commands registered successfully');
}
