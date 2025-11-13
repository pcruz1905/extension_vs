import type {
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node.js";
import type * as vscode from "vscode";
import * as path from "node:path";
import { LanguageClient, TransportKind } from "vscode-languageclient/node.js";

let client: LanguageClient;

// This function is called when the extension is activated.
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  client = await startLanguageClient(context);

  // Register commands that communicate with the language server
  // const commands = [
  //   vscode.commands.registerCommand(
  //     "sellhub-liquid.testConnection",
  //     async () => {
  //       vscode.window.showInformationMessage(`Testing R2 connection...`);

  //       try {
  //         // Send command to language server to test R2 connection
  //         const result = await client.sendRequest("workspace/executeCommand", {
  //           command: "sellhub-liquid.testConnection",
  //           arguments: [],
  //         });
  //         console.log(result);

  //         vscode.window.showInformationMessage("✓ R2 connection successful!");
  //       } catch (error) {
  //         const errorMessage =
  //           error instanceof Error ? error.message : String(error);
  //         vscode.window.showErrorMessage(
  //           `✗ R2 connection failed: ${errorMessage}`
  //         );
  //       }
  //     }
  //   ),

  //   vscode.commands.registerCommand(
  //     "sellhub-liquid.getComponentManifest",
  //     async () => {
  //       try {
  //         const result = await client.sendRequest("workspace/executeCommand", {
  //           command: "sellhub-liquid.getComponentManifest",
  //           arguments: [],
  //         });

  //         vscode.window.showInformationMessage("✓ Component manifest loaded!");
  //         console.log("Component manifest:", result);
  //       } catch (error) {
  //         const errorMessage =
  //           error instanceof Error ? error.message : String(error);
  //         vscode.window.showErrorMessage(
  //           `✗ Failed to get manifest: ${errorMessage}`
  //         );
  //       }
  //     }
  //   ),

  //   vscode.commands.registerCommand(
  //     "sellhub-liquid.refreshConfig",
  //     async () => {
  //       try {
  //         const result = await client.sendRequest("workspace/executeCommand", {
  //           command: "sellhub-liquid.refreshConfig",
  //           arguments: [],
  //         });
  //         console.log(result);

  //         vscode.window.showInformationMessage("✓ Configuration refreshed!");
  //       } catch (error) {
  //         const errorMessage =
  //           error instanceof Error ? error.message : String(error);
  //         vscode.window.showErrorMessage(
  //           `✗ Failed to refresh config: ${errorMessage}`
  //         );
  //       }
  //     }
  //   ),
  // ];

  // // Add all commands to subscriptions
  // commands.forEach((command) => context.subscriptions.push(command));
}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
  if (client) {
    return client.stop();
  }
  return undefined;
}

async function startLanguageClient(
  context: vscode.ExtensionContext
): Promise<LanguageClient> {
  const serverModule = context.asAbsolutePath(
    path.join("out", "language", "main.cjs")
  );
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
  // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
  const debugOptions = {
    execArgv: [
      "--nolazy",
      `--inspect${process.env.DEBUG_BREAK ? "-brk" : ""}=${
        process.env.DEBUG_SOCKET || "6009"
      }`,
    ],
  };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "*", language: "sellhub-liquid" }],
  };

  // Create the language client and start the client.
  const client = new LanguageClient(
    "sellhub-liquid",
    "sellhub liquid",
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  await client.start();
  return client;
}
