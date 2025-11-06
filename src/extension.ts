import * as vscode from "vscode";
import { LiquidCompletionProvider } from "./completion/liquidCompletion";
import { ContextCompletionProvider } from "./completion/contextCompletion";
import { R2Client } from "./r2/r2Client";

let r2Client: R2Client;

export function activate(context: vscode.ExtensionContext) {
  console.log("Sellhub Liquid IntelliSense extension is now active");

  const config = vscode.workspace.getConfiguration("sellhubb");
  r2Client = new R2Client({
    r2BucketName: config.get<string>("r2BucketName") || "",
    r2AccountId: config.get<string>("r2AccountId") || "",
    r2AccessKeyId: config.get<string>("r2AccessKeyId") || "",
    r2SecretAccessKey: config.get<string>("r2SecretAccessKey") || "",
  });

  // Create completion providers
  const completionProvider = new LiquidCompletionProvider(r2Client);
  const contextProvider = new ContextCompletionProvider();

  // Register island/component completion provider for Liquid files
  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    { language: "liquid", scheme: "file" },
    completionProvider,
    '"',
    "'",
    "{",
    " ",
    ":" // Trigger characters
  );

  // Register context object completion provider (product., collection., shop.)
  const contextDisposable = vscode.languages.registerCompletionItemProvider(
    { language: "liquid", scheme: "file" },
    contextProvider,
    "." // Trigger on dot
  );

  // Register hover provider for component documentation
  const hoverDisposable = vscode.languages.registerHoverProvider(
    { language: "liquid", scheme: "file" },
    {
      provideHover: (document, position) =>
        completionProvider.provideHover(document, position),
    }
  );

  // Command: Refresh component cache
  const refreshCacheCommand = vscode.commands.registerCommand(
    "sellhubb.refreshCache",
    () => {
      r2Client.clearCache();
    }
  );

  // Command: Sync components from R2
  const syncComponentsCommand = vscode.commands.registerCommand(
    "sellhubb.syncComponents",
    async () => {
      try {
        vscode.window.showInformationMessage(
          "Syncing components from Cloudflare R2..."
        );
        const manifest = await r2Client.getComponentManifest();
        vscode.window.showInformationMessage(
          `Synced ${manifest.components.length} components successfully`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `Failed to sync components: ${errorMessage}`
        );
      }
    }
  );

  // Command: Show cache stats (for debugging)
  const cacheStatsCommand = vscode.commands.registerCommand(
    "sellhubb.showCacheStats",
    () => {
      const stats = r2Client.getCacheStats();
      vscode.window.showInformationMessage(
        `Cache stats - Manifest: ${
          stats.manifestCached ? "cached" : "not cached"
        }, Metadata entries: ${stats.metadataCacheSize}`
      );
    }
  );

  // Command: Test R2 connection
  const testConnectionCommand = vscode.commands.registerCommand(
    "sellhubb.testConnection",
    async () => {
      const config = vscode.workspace.getConfiguration("sellhubb");

      const r2BucketName = config.get<string>("r2BucketName");
      const r2AccountId = config.get<string>("r2AccountId");
      const r2AccessKeyId = config.get<string>("r2AccessKeyId");
      const r2SecretAccessKey = config.get<string>("r2SecretAccessKey");

      if (
        !r2BucketName ||
        !r2AccountId ||
        !r2AccessKeyId ||
        !r2SecretAccessKey
      ) {
        vscode.window.showErrorMessage(
          "Missing R2 credentials. Please configure all settings."
        );
        return;
      }

      vscode.window.showInformationMessage(
        `Testing R2 connection...\nAccount: ${r2AccountId.substring(0, 8)}`
      );

      try {
        await r2Client.getComponentManifest();
        vscode.window.showInformationMessage("✓ R2 connection successful!");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(
          `✗ R2 connection failed: ${errorMessage}`
        );
      }
    }
  );

  // Listen for configuration changes
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration("sellhubb")) {
        console.log("Sellhubb configuration changed, updating R2 client...");
        r2Client.updateConfig();
        r2Client.clearCache(); // Clear cache when config changes
      }
    }
  );

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
