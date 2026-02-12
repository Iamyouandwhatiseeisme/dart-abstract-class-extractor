import * as vscode from "vscode";

/**
 * Provides code actions for Dart files to convert classes to abstract classes
 */
export class DartAbstractClassProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): vscode.CodeAction[] | undefined {
    const documentText = document.getText();

    // Simple check: is there a class in the document?
    if (!documentText.includes("class ")) {
      return;
    }

    // Create the code action
    const action = new vscode.CodeAction(
      "Convert to Abstract Class",
      vscode.CodeActionKind.RefactorRewrite,
    );

    action.command = {
      command: "dart-abstract-class-extractor.convertToAbstract",
      title: "Convert to Abstract Class",
    };

    return [action];
  }
}
