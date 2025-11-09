import * as vscode from "vscode";
import { getWebviewContent } from "./webviewContent";
import { detectContext } from "./contextDetector";
import { BackendClient } from "./BackendClient";

export class PreviewManager {
  private panel: vscode.WebviewPanel | null = null;
  private backend: BackendClient;

  constructor(private context: vscode.ExtensionContext) {
    this.backend = new BackendClient();
  }

  openPreview(toSide: boolean = false) {
    const column = toSide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;

    if (this.panel) {
      this.panel.reveal(column);
      this.refresh();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "sellhubbPreview",
      "Sellhubb Preview",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = null;
    });

    this.refresh();
  }

  async refresh() {
    if (!this.panel) {
      vscode.window.showWarningMessage("No preview open to refresh.");
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const fileUri = editor.document.uri;
    const contextData = detectContext(fileUri);
    const backendData = await this.backend.fetchData(contextData);

    this.panel.webview.html = getWebviewContent(backendData);
  }
}
