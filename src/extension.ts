import * as vscode from 'vscode';
import { KVClient } from './kv/kvClient';
import { LiquidCompletionProvider } from './completion/liquidCompletion';
import { ContextCompletionProvider } from './completion/contextCompletion';

let kvClient: KVClient;

export function activate(context: vscode.ExtensionContext) {
	console.log('Sellhub Liquid IntelliSense extension is now active');

	// Initialize KV client
	kvClient = new KVClient();
	kvClient.updateConfig();

	// Create completion providers
	const completionProvider = new LiquidCompletionProvider(kvClient);
	const contextProvider = new ContextCompletionProvider();

	// Register island/component completion provider for Liquid files
	const completionDisposable = vscode.languages.registerCompletionItemProvider(
		{ language: 'liquid', scheme: 'file' },
		completionProvider,
		'"', "'", '{', ' ', ':', // Trigger characters
	);

	// Register context object completion provider (product., collection., shop.)
	const contextDisposable = vscode.languages.registerCompletionItemProvider(
		{ language: 'liquid', scheme: 'file' },
		contextProvider,
		'.' // Trigger on dot
	);

	// Register hover provider for component documentation
	const hoverDisposable = vscode.languages.registerHoverProvider(
		{ language: 'liquid', scheme: 'file' },
		{
			provideHover: (document, position) => completionProvider.provideHover(document, position)
		}
	);

	// Command: Refresh component cache
	const refreshCacheCommand = vscode.commands.registerCommand('sellhubb.refreshCache', () => {
		kvClient.clearCache();
	});

	// Command: Sync components from KV
	const syncComponentsCommand = vscode.commands.registerCommand('sellhubb.syncComponents', async () => {
		try {
			vscode.window.showInformationMessage('Syncing components from Cloudflare KV...');
			const manifest = await kvClient.getComponentManifest();
			vscode.window.showInformationMessage(`Synced ${manifest.components.length} components successfully`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to sync components: ${errorMessage}`);
		}
	});

	// Command: Show cache stats (for debugging)
	const cacheStatsCommand = vscode.commands.registerCommand('sellhubb.showCacheStats', () => {
		const stats = kvClient.getCacheStats();
		vscode.window.showInformationMessage(
			`Cache stats - Manifest: ${stats.manifestCached ? 'cached' : 'not cached'}, Metadata entries: ${stats.metadataCacheSize}`
		);
	});

	// Command: Test KV connection
	const testConnectionCommand = vscode.commands.registerCommand('sellhubb.testConnection', async () => {
		const config = vscode.workspace.getConfiguration('sellhubb');
		const accountId = config.get<string>('kvAccountId');
		const namespaceId = config.get<string>('kvNamespaceId');
		const apiToken = config.get<string>('kvApiToken');

		if (!accountId || !namespaceId || !apiToken) {
			vscode.window.showErrorMessage('Missing KV credentials. Please configure all settings.');
			return;
		}

		vscode.window.showInformationMessage(`Testing KV connection...\nAccount: ${accountId.substring(0, 8)}...\nNamespace: ${namespaceId.substring(0, 8)}...`);

		try {
			await kvClient.getComponentManifest();
			vscode.window.showInformationMessage('✓ KV connection successful!');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`✗ KV connection failed: ${errorMessage}`);
		}
	});

	// Listen for configuration changes
	const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('sellhubb')) {
			console.log('Sellhubb configuration changed, updating KV client...');
			kvClient.updateConfig();
			kvClient.clearCache(); // Clear cache when config changes
		}
	});

	// Add all disposables to subscriptions
	context.subscriptions.push(
		completionDisposable,
		contextDisposable,
		hoverDisposable,
		refreshCacheCommand,
		syncComponentsCommand,
		cacheStatsCommand,
		testConnectionCommand,
		configChangeDisposable
	);
}

export function deactivate() {
	// Cleanup if needed
}
