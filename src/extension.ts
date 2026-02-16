import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { convertToAbstractCommand } from "./commands/convertToAbstractCommand";
import { DartAbstractClassProvider } from "./providers/dartAbstractClassProvider";

export function activate(context: vscode.ExtensionContext) {
  if (os.platform() !== "win32") {
    const binaryPath = path.join(context.extensionPath, "ast_extractor.exe");
    try {
      fs.chmodSync(binaryPath, 0o755);
    } catch (e) {
      console.error("Failed to set binary permissions:", e);
    }
  }
  // Register the command
  const disposable = vscode.commands.registerCommand(
    "dart-abstract-class-extractor.convertToAbstract",
    convertToAbstractCommand,
  );

  // Register the code action provider for Dart files
  const provider = vscode.languages.registerCodeActionsProvider(
    "dart",
    new DartAbstractClassProvider(),
    {
      providedCodeActionKinds: [
        vscode.CodeActionKind.Refactor,
        vscode.CodeActionKind.RefactorRewrite,
        vscode.CodeActionKind.QuickFix,
      ],
    },
  );

  context.subscriptions.push(disposable, provider);
}

export function deactivate() {}
