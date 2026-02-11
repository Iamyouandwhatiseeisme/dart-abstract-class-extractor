import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Flutter clean code extension is now active!');

    // Register the command
    let disposable = vscode.commands.registerCommand('flutter-clean-code.convertToAbstract', async () => {
        await convertToAbstractCommand();
    });

    // Register the code action provider for Dart files
   const provider = vscode.languages.registerCodeActionsProvider(
    'dart',  // Simplified selector
    new DartAbstractClassProvider(),
    {
        providedCodeActionKinds: [
            vscode.CodeActionKind.Refactor,
            vscode.CodeActionKind.RefactorRewrite,
            vscode.CodeActionKind.QuickFix
        ]
    }
);

    context.subscriptions.push(disposable, provider);
}

class DartAbstractClassProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        
        console.log('provideCodeActions called!');
        console.log('Language:', document.languageId);
        console.log('Has class:', document.getText().includes('class '));
        
        // Check if cursor is inside a class
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

async function convertToAbstractCommand() {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found!');
        return;
    }

    // Check if it's a Dart file
    if (editor.document.languageId !== 'dart') {
        vscode.window.showErrorMessage('This command only works with Dart files!');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    // If nothing selected, try to find the class at cursor position
    const textToProcess = selectedText || editor.document.getText();
    
    try {
        const result = convertToAbstractClass(textToProcess);
        
        if (!result) {
            vscode.window.showErrorMessage('No valid Dart class found!');
            return;
        }

        const { abstractClass, interfaceClass, concreteClass } = result;
        const fullOutput = `${abstractClass}\n\n${interfaceClass}\n\n${concreteClass}`;

        // Ask user what to do with the result
        const action = await vscode.window.showQuickPick(
            ['Replace current class', 'Insert below', 'Copy to clipboard'],
            { placeHolder: 'What would you like to do with the generated code?' }
        );

        if (!action) return;

        switch (action) {
            case 'Replace current class':
                await editor.edit(editBuilder => {
                    if (selectedText) {
                        editBuilder.replace(selection, fullOutput);
                    } else {
                        // Replace entire document
                        const fullRange = new vscode.Range(
                            editor.document.positionAt(0),
                            editor.document.positionAt(editor.document.getText().length)
                        );
                        editBuilder.replace(fullRange, fullOutput);
                    }
                });
                break;
                
            case 'Insert below':
                const endPosition = selection.isEmpty ? 
                    editor.document.positionAt(editor.document.getText().length) : 
                    selection.end;
                await editor.edit(editBuilder => {
                    editBuilder.insert(endPosition, '\n\n' + fullOutput);
                });
                break;
                
            case 'Copy to clipboard':
                await vscode.env.clipboard.writeText(fullOutput);
                vscode.window.showInformationMessage('Code copied to clipboard!');
                break;
        }
        
        vscode.window.showInformationMessage('Abstract class, interface, and implementation created successfully!');
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
    }
}

function convertToAbstractClass(dartCode: string): { abstractClass: string, interfaceClass: string, concreteClass: string } | null {
    // Remove comments
    const codeWithoutComments = dartCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Match class declaration
    const classMatch = codeWithoutComments.match(/class\s+(\w+)(\s+extends\s+\w+)?(\s+implements\s+[\w\s,]+)?(\s+with\s+[\w\s,]+)?\s*\{/);
    
    if (!classMatch) {
        return null;
    }

    const className = classMatch[1];
    const extendsClause = classMatch[2] || '';
    const implementsClause = classMatch[3] || '';
    const withClause = classMatch[4] || '';
    
    // Extract class body
    const classBodyStart = dartCode.indexOf('{', classMatch.index!);
    let braceCount = 1;
    let classBodyEnd = classBodyStart + 1;
    
    for (let i = classBodyStart + 1; i < dartCode.length; i++) {
        if (dartCode[i] === '{') braceCount++;
        if (dartCode[i] === '}') braceCount--;
        if (braceCount === 0) {
            classBodyEnd = i;
            break;
        }
    }
    
    const classBody = dartCode.substring(classBodyStart + 1, classBodyEnd);
    
    // Extract methods (public methods only, excluding constructors)
    const methodRegex = /^\s*(?!\/\/|\/\*|abstract)(\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)\s*(?:async\s*)?(?:=>|{)/gm;
    const methods: Array<{ signature: string, returnType: string, name: string, params: string }> = [];
    let match;
    
    while ((match = methodRegex.exec(classBody)) !== null) {
        const returnType = match[1];
        const methodName = match[2];
        
        // Skip constructors
        if (methodName === className) continue;
        
        // Skip private methods (starting with _)
        if (methodName.startsWith('_')) continue;
        
        // Extract full method signature
        const methodStart = match.index;
        const signatureMatch = classBody.substring(methodStart).match(/^[^{;=>]*/);
        
        if (signatureMatch) {
            let signature = signatureMatch[0].trim();
            // Remove 'async' keyword if present
            signature = signature.replace(/\s+async\s*$/, '');
            
            // Extract parameters
            const paramsMatch = signature.match(/\(([^)]*)\)/);
            const params = paramsMatch ? paramsMatch[1] : '';
            
            methods.push({ 
                signature, 
                returnType, 
                name: methodName,
                params 
            });
        }
    }
    
    // Extract properties (fields)
    const propertyRegex = /^\s*(?:final|const)?\s*(\w+(?:<[^>]+>)?)\s+(\w+)\s*(?:=|;)/gm;
    const properties: Array<{ type: string, name: string }> = [];
    
    while ((match = propertyRegex.exec(classBody)) !== null) {
        const type = match[1];
        const propName = match[2];
        
        // Skip private properties
        if (propName.startsWith('_')) continue;
        
        // Skip if it's inside a method
        const beforeMatch = classBody.substring(0, match.index);
        const openBraces = (beforeMatch.match(/{/g) || []).length;
        const closeBraces = (beforeMatch.match(/}/g) || []).length;
        
        if (openBraces > closeBraces) continue;
        
        properties.push({ type, name: propName });
    }
    
    const interfaceName = `I${className}`;
    
    // Build abstract class
    let abstractClass = `abstract class ${className}${extendsClause}${implementsClause}${withClause} {\n`;
    
    // Add properties as abstract getters
    if (properties.length > 0) {
        abstractClass += properties.map(p => `  ${p.type} get ${p.name};`).join('\n') + '\n';
        if (methods.length > 0) {
            abstractClass += '\n';
        }
    }
    
    // Add abstract methods
    if (methods.length > 0) {
        abstractClass += methods.map(m => `  ${m.signature};`).join('\n') + '\n';
    }
    
    abstractClass += '}';
    
    // Build interface
    let interfaceClass = `abstract class ${interfaceName} {\n`;
    
    // Add properties as abstract getters in interface
    if (properties.length > 0) {
        interfaceClass += properties.map(p => `  ${p.type} get ${p.name};`).join('\n') + '\n';
        if (methods.length > 0) {
            interfaceClass += '\n';
        }
    }
    
    // Add abstract methods in interface
    if (methods.length > 0) {
        interfaceClass += methods.map(m => `  ${m.signature};`).join('\n') + '\n';
    }
    
    interfaceClass += '}';
    
    // Build concrete class with implementation
    const concreteClassName = `${className}Impl`;
    let concreteClass = `class ${concreteClassName} implements ${interfaceName} {\n`;
    
    // Add properties with @override
    if (properties.length > 0) {
        concreteClass += properties.map(p => `  @override\n  final ${p.type} ${p.name};`).join('\n\n') + '\n';
        if (methods.length > 0) {
            concreteClass += '\n';
        }
    }
    
    // Add constructor if there are properties
    if (properties.length > 0) {
        const constructorParams = properties.map(p => `required this.${p.name}`).join(', ');
        concreteClass += `  ${concreteClassName}({${constructorParams}});\n`;
        if (methods.length > 0) {
            concreteClass += '\n';
        }
    }
    
    // Add methods with @override
    if (methods.length > 0) {
        concreteClass += methods.map(m => {
            return `  @override\n  ${m.signature} {\n    // TODO: implement ${m.name}\n    throw UnimplementedError();\n  }`;
        }).join('\n\n') + '\n';
    }
    
    concreteClass += '}';
    
    return { abstractClass, interfaceClass, concreteClass };
}

export function deactivate() {}