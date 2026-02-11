import * as vscode from 'vscode';

/**
 * Provides code actions for Dart files to convert classes to abstract classes
 */
export class DartAbstractClassProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        
        console.log('provideCodeActions called!');
        console.log('Language:', document.languageId);
        console.log('Has class:', document.getText().includes('class '));
        
        const documentText = document.getText();
        
        // Simple check: is there a class in the document?
        if (!documentText.includes('class ')) {
            console.log('No class found, returning undefined');
            return;
        }

        console.log('Creating code action');
        
        // Create the code action
        const action = new vscode.CodeAction(
            'Convert to Abstract Class',
            vscode.CodeActionKind.RefactorRewrite
        );
        
        action.command = {
            command: 'flutter-clean-code.convertToAbstract',
            title: 'Convert to Abstract Class'
        };

        console.log('Returning code action');
        return [action];
    }
}