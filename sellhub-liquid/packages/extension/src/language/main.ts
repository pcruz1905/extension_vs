import { startLanguageServer } from "langium/lsp";
import { NodeFileSystem } from "langium/node";
import {
  createConnection,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} from "vscode-languageserver/node.js";
import { createSellhubLiquidServices } from "sellhub-liquid-language";
import { TextDocument } from "vscode-languageserver-textdocument";

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Create the simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Inject the shared services and language-specific services
const { shared, SellhubLiquid } = createSellhubLiquidServices({
  connection,
  ...NodeFileSystem,
});
const sellhubLiquidServices = SellhubLiquid;

// Hold references to services
let r2Client: any;
let configService: any;

connection.onInitialize(
  async (params: InitializeParams): Promise<InitializeResult> => {
    // Initialize services
    r2Client = sellhubLiquidServices.services.R2Client;
    configService = sellhubLiquidServices.services.ConfigService;

    // Wait for configuration to load
    await configService.loadConfiguration();
    const config = configService.getConfig();
    console.log("Loaded configuration:", config);
    r2Client.updateConfig(config);

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        executeCommandProvider: {
          commands: [
            "sellhub-liquid.testConnection",
            "sellhub-liquid.getComponentManifest",
            "sellhub-liquid.refreshConfig",
          ],
        },
        // Add other capabilities as needed
        completionProvider: {
          triggerCharacters: [".", '"', "'", "{", "%"],
        },
        hoverProvider: true,
        documentSymbolProvider: true,
      },
    };

    return result;
  }
);

// Handle custom commands
connection.onExecuteCommand(async (params) => {
  const { command } = params;

  try {
    switch (command) {
      case "sellhub-liquid.testConnection":
        connection.console.log("Testing R2 connection...");
        const manifest = await r2Client.getComponentManifest();
        return { success: true, message: "R2 connection successful", manifest };

      case "sellhub-liquid.getComponentManifest":
        connection.console.log("Fetching component manifest...");
        const componentManifest = await r2Client.getComponentManifest();
        return { success: true, manifest: componentManifest };

      case "sellhub-liquid.refreshConfig":
        connection.console.log("Refreshing configuration...");
        await configService.loadConfiguration();
        const config = configService.getConfig();
        r2Client.updateConfig(config);
        return { success: true, config };

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    connection.console.error(`Command ${command} failed: ${errorMessage}`);
    throw error;
  }
});

// Optional: Handle configuration changes
connection.onDidChangeConfiguration(async (change) => {
  connection.console.log("Configuration changed, reloading...");
  await configService.loadConfiguration();
  const config = configService.getConfig();
  r2Client.updateConfig(config);
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Start the language server with the shared services
startLanguageServer(shared);
