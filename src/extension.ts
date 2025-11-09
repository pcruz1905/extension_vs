import * as vscode from "vscode";
import * as path from "path";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { PreviewManager } from "./preview/PreviewManager";

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log("Sellhub Liquid IntelliSense extension is now active");

  // Setup language server
  const serverModule = context.asAbsolutePath(
    path.join("dist", "server", "language-server.js")
  );

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: "liquid", scheme: "file" },
      { language: "html", scheme: "file" },
    ],
    synchronize: {
      configurationSection: "sellhubb",
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.liquid"),
    },
    outputChannel: vscode.window.createOutputChannel(
      "Sellhubb Language Server"
    ),
  };

  // Create the language client
  client = new LanguageClient(
    "sellhubbLiquidLanguageServer",
    "Sellhubb Liquid Language Server",
    serverOptions,
    clientOptions
  );

  client.onDidChangeState((event) => {
    console.log(
      "Language server state changed:",
      event.oldState,
      "->",
      event.newState
    );
  });

  // Setup notification handlers
  setupNotificationHandlers();

  // Register commands
  registerCommands(context);

  // Start the client
  client
    .start()
    .then(() => {
      console.log("Language client start method completed");
    })
    .catch((error) => {
      console.error("Failed to start language client:", error);
      vscode.window.showErrorMessage(
        `Failed to start language client: ${error.message}`
      );
    });
}

function setupNotificationHandlers() {
  client.onNotification("showInformationMessage", (params: any) => {
    vscode.window.showInformationMessage(params.message);
  });

  client.onNotification("showErrorMessage", (params: any) => {
    vscode.window.showErrorMessage(params.message);
  });

  client.onNotification("showWarningMessage", (params: any) => {
    vscode.window.showWarningMessage(params.message);
  });

  client.onNotification("openSettings", (params: any) => {
    vscode.commands.executeCommand(
      "workbench.action.openSettings",
      params.query
    );
  });
}

function registerCommands(context: vscode.ExtensionContext) {
  const previewManager = new PreviewManager(context);

  const commands = [
    vscode.commands.registerCommand("sellhubb.refreshCache", async () => {
      await executeServerCommand(
        "sellhubb.clearCache",
        "Failed to clear cache"
      );
    }),

    vscode.commands.registerCommand("sellhubb.syncComponents", async () => {
      await executeServerCommand(
        "sellhubb.syncComponents",
        "Failed to sync components"
      );
    }),

    vscode.commands.registerCommand("sellhubb.showCacheStats", async () => {
      await executeServerCommand(
        "sellhubb.showCacheStats",
        "Failed to get cache stats"
      );
    }),

    vscode.commands.registerCommand("sellhubb.testConnection", async () => {
      await executeServerCommand(
        "sellhubb.testConnection",
        "Failed to test R2 connection"
      );
    }),

    vscode.commands.registerCommand(
      "sellhubb.validateConfiguration",
      async () => {
        await executeServerCommand(
          "sellhubb.validateConfiguration",
          "Failed to validate configuration"
        );
      }
    ),

    vscode.commands.registerCommand("sellhubb.getComponentList", async () => {
      await executeServerCommand(
        "sellhubb.getComponentList",
        "Failed to get component list"
      );
    }),

    vscode.commands.registerCommand("sellhubb.openSettings", async () => {
      await executeServerCommand(
        "sellhubb.openSettings",
        "Failed to open settings"
      );
    }),

    vscode.commands.registerCommand("sellhubb.openPreview", () =>
      previewManager.openPreview()
    ),
    vscode.commands.registerCommand("sellhubb.openPreviewToSide", () =>
      previewManager.openPreview(true)
    ),
    vscode.commands.registerCommand("sellhubb.refreshPreview", () =>
      previewManager.refresh()
    ),
  ];

  // Add all commands to subscriptions
  commands.forEach((command) => context.subscriptions.push(command));
}

async function executeServerCommand(command: string, errorMessage: string) {
  try {
    const result = await client.sendRequest("workspace/executeCommand", {
      command,
    });
    console.log(`Command ${command} result:`, result);
  } catch (error) {
    console.error(`Command ${command} failed:`, error);
    vscode.window.showErrorMessage(errorMessage);
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
