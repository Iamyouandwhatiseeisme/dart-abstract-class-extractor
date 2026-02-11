import * as vscode from 'vscode';

/**
 * Configuration utility for the Flutter Clean Code extension
 */
export class ExtensionConfig {
    private static readonly EXTENSION_NAME = 'flutterCleanCode';
    
    /**
     * Gets the interface prefix (default: "I")
     */
    static getInterfacePrefix(): string {
        const config = vscode.workspace.getConfiguration(this.EXTENSION_NAME);
        return config.get<string>('interfacePrefix', 'I');
    }
    
    /**
     * Gets the implementation suffix (default: "Impl")
     */
    static getImplementationSuffix(): string {
        const config = vscode.workspace.getConfiguration(this.EXTENSION_NAME);
        return config.get<string>('implementationSuffix', 'Impl');
    }
}