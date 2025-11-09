import * as vscode from "vscode";

export function detectContext(uri: vscode.Uri): {
  fileName: string;
  filePath: string;
  workspace?: string;
} {
  const workspace = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;
  const fileName = uri.fsPath.split(/[/\\]/).pop() ?? "unknown";

  return {
    fileName,
    filePath: uri.fsPath,
    workspace,
  };
}
