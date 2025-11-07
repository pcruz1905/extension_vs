import {
  CompletionItem,
  CompletionItemKind,
  createConnection,
  DidChangeConfigurationNotification,
  Hover,
  InitializeResult,
  MarkupKind,
  ProposedFeatures,
  TextDocumentPositionParams,
  TextDocuments,
  TextDocumentSyncKind,
  InsertTextFormat,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { R2Client } from "./r2/r2Client";
import { LiquidCompletionProvider } from "./completion/liquidCompletion";

let connection = createConnection(ProposedFeatures.all);
let documents = new TextDocuments(TextDocument);

let r2Client: R2Client | null = null;
let hasConfigurationCapability = false;
let completionProvider: LiquidCompletionProvider | null = null;

connection.onInitialize((params) => {
  const capabilities = params.capabilities;
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"', "'", "{", " ", ":", "."],
      },
      hoverProvider: true,
    },
  };

  if (hasConfigurationCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return result;
});

connection.onInitialized(async () => {
  if (hasConfigurationCapability) {
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
    await initializeR2Client();
  }
});

connection.onDidChangeConfiguration(async () => {
  await initializeR2Client();
});

async function initializeR2Client() {
  try {
    const config = await connection.workspace.getConfiguration("sellhubb");

    r2Client = new R2Client({
      r2BucketName: (config.r2BucketName as string) || "",
      r2AccountId: (config.r2AccountId as string) || "",
      r2AccessKeyId: (config.r2AccessKeyId as string) || "",
      r2SecretAccessKey: (config.r2SecretAccessKey as string) || "",
    });

    completionProvider = new LiquidCompletionProvider(r2Client);

    connection.console.log("R2 client initialized successfully");
  } catch (error) {
    r2Client = null;
    completionProvider = null;

    const errorMessage = error instanceof Error ? error.message : String(error);
    connection.console.error(`Failed to initialize R2 client: ${errorMessage}`);

    connection.sendNotification("showErrorMessage", {
      message: `Failed to initialize R2 client: ${errorMessage}`,
    });
  }
}

// Completion provider
connection.onCompletion(
  async (
    textDocumentPosition: TextDocumentPositionParams
  ): Promise<CompletionItem[]> => {
    if (!completionProvider) return [];

    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) return [];

    return await completionProvider.provideCompletionItems(
      document,
      textDocumentPosition.position
    );
  }
);

// Hover provider
connection.onHover(
  async (
    textDocumentPosition: TextDocumentPositionParams
  ): Promise<Hover | null> => {
    if (!completionProvider) return null;

    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) return null;

    return await completionProvider.provideHover(
      document,
      textDocumentPosition.position
    );
  }
);

// Command handlers
connection.onExecuteCommand(async (params) => {
  switch (params.command) {
    case "sellhubb.clearCache": {
      try {
        if (r2Client) {
          r2Client.clearCache();
          connection.console.log("Component cache cleared");

          connection.sendNotification("showInformationMessage", {
            message: "Component cache cleared successfully",
          });

          return { success: true };
        } else {
          connection.sendNotification("showErrorMessage", {
            message: "R2 client not initialized",
          });
          return { success: false, error: "R2 client not initialized" };
        }
      } catch (error) {
        const errorMessage = `Failed to clear cache: ${
          (error as Error).message
        }`;
        connection.sendNotification("showErrorMessage", {
          message: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    }

    case "sellhubb.testConnection": {
      try {
        if (r2Client) {
          await r2Client.testConnection();

          connection.sendNotification("showInformationMessage", {
            message: "✓ R2 connection successful!",
          });

          return { success: true };
        }

        connection.sendNotification("showErrorMessage", {
          message: "R2 client not initialized",
        });
        return { success: false, error: "R2 client not initialized" };
      } catch (error) {
        const errorMessage = `✗ R2 connection failed: ${
          (error as Error).message
        }`;
        connection.sendNotification("showErrorMessage", {
          message: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    }

    case "sellhubb.syncComponents": {
      try {
        if (r2Client) {
          connection.sendNotification("showInformationMessage", {
            message: "Syncing components from Cloudflare R2...",
          });

          const manifest = await r2Client.getComponentManifest();
          r2Client.clearCache(); // Clear to force refresh

          connection.sendNotification("showInformationMessage", {
            message: `Synced ${manifest.components.length} components successfully`,
          });

          return { success: true, componentsCount: manifest.components.length };
        } else {
          connection.sendNotification("showErrorMessage", {
            message: "R2 client not initialized",
          });
          return { success: false, error: "R2 client not initialized" };
        }
      } catch (error) {
        const errorMessage = `Failed to sync components: ${
          (error as Error).message
        }`;
        connection.sendNotification("showErrorMessage", {
          message: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    }

    case "sellhubb.showCacheStats": {
      try {
        if (r2Client) {
          const stats = r2Client.getCacheStats();
          const message = `Cache stats - Manifest: ${
            stats.manifestCached ? "cached" : "not cached"
          }, Metadata entries: ${stats.metadataCacheSize}`;

          connection.sendNotification("showInformationMessage", {
            message: message,
          });

          return { success: true, stats: stats };
        } else {
          connection.sendNotification("showErrorMessage", {
            message: "R2 client not initialized",
          });
          return { success: false, error: "R2 client not initialized" };
        }
      } catch (error) {
        const errorMessage = `Failed to get cache stats: ${
          (error as Error).message
        }`;
        connection.sendNotification("showErrorMessage", {
          message: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    }

    default:
      const errorMessage = `Unknown command: ${params.command}`;
      connection.sendNotification("showErrorMessage", {
        message: errorMessage,
      });
      return { success: false, error: errorMessage };
  }
});

// Start the server
documents.listen(connection);
connection.listen();
