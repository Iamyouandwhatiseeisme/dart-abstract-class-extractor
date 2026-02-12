import * as vscode from "vscode";
import { convertToAbstractCommand } from "./commands/convertToAbstractCommand";
import { DartAbstractClassProvider } from "./providers/dartAbstractClassProvider";

export function activate(context: vscode.ExtensionContext) {
  // Register the command
  const disposable = vscode.commands.registerCommand(
    "flutter-clean-code.convertToAbstract",
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
