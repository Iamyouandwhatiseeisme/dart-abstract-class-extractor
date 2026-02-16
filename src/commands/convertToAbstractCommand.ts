import * as vscode from "vscode";
import { DartClassParser } from "../utils/dartClassParser";
import { ExtensionConfig } from "../utils/extensionConfig";
import * as self from "./convertToAbstractCommand";

/**
 * Command to convert a Dart class to interface and implementation
 */
export async function convertToAbstractCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage("No active editor found!");
    return;
  }

  // Check if it's a Dart file
  if (editor.document.languageId !== "dart") {
    vscode.window.showErrorMessage("This command only works with Dart files!");
    return;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);

  // If nothing selected, use the entire document
  const textToProcess = selectedText || editor.document.getText();

  try {
    // Get user configuration
    const interfacePrefix = ExtensionConfig.getInterfacePrefix();
    const implementationSuffix = ExtensionConfig.getImplementationSuffix();

    const result = DartClassParser.convertToAbstractClass(
      textToProcess,
      interfacePrefix,
      implementationSuffix,
    );

    if (!result) {
      vscode.window.showErrorMessage("No valid Dart class found!");
      return;
    }

    const { interfaceClass, concreteClass } = result;
    const fullOutput = `${interfaceClass}\n\n${concreteClass}`;

    // Ask user what to do with the result
    const action = await vscode.window.showQuickPick(
      ["Replace current class", "Insert below", "Copy to clipboard"],
      { placeHolder: "What would you like to do with the generated code?" },
    );

    if (!action) {
      return;
    }

    await handleUserAction(editor, action, fullOutput, selection, selectedText);

    vscode.window.showInformationMessage(
      "Interface and implementation created successfully!",
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error}`);
  }
}

/**
 * Handles the user's chosen action for the generated code
 */
async function handleUserAction(
  editor: vscode.TextEditor,
  action: string,
  fullOutput: string,
  selection: vscode.Selection,
  selectedText: string,
): Promise<void> {
  switch (action) {
    case "Replace current class":
      await replaceCurrentClass(editor, fullOutput, selection, selectedText);
      break;

    case "Insert below":
      await insertBelow(editor, fullOutput, selection);
      break;

    case "Copy to clipboard":
      await copyToClipboard(fullOutput);
      break;
  }
}

/**
 * Replaces the current class with the generated code
 */
async function replaceCurrentClass(
  editor: vscode.TextEditor,
  fullOutput: string,
  selection: vscode.Selection,
  selectedText: string,
): Promise<void> {
  await editor.edit((editBuilder) => {
    if (selectedText) {
      editBuilder.replace(selection, fullOutput);
    } else {
      // Replace entire document
      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length),
      );
      editBuilder.replace(fullRange, fullOutput);
    }
  });
}

/**
 * Inserts the generated code below the current selection or end of document
 */
async function insertBelow(
  editor: vscode.TextEditor,
  fullOutput: string,
  selection: vscode.Selection,
): Promise<void> {
  const endPosition = selection.isEmpty
    ? editor.document.positionAt(editor.document.getText().length)
    : selection.end;

  await editor.edit((editBuilder) => {
    editBuilder.insert(endPosition, "\n\n" + fullOutput);
  });
}

/**
 * Copies the generated code to clipboard
 */
async function copyToClipboard(fullOutput: string): Promise<void> {
  await self.writeToClipboard(fullOutput);
}

export async function writeToClipboard(text: string): Promise<void> {
  await vscode.env.clipboard.writeText(text);
  vscode.window.showInformationMessage("Code copied to clipboard!");
}
