/**
 * Interface for method information extracted from Dart code
 */
export interface MethodInfo {
    signature: string;
    returnType: string;
    name: string;
    params: string;
}

/**
 * Interface for property information extracted from Dart code
 */
export interface PropertyInfo {
    type: string;
    name: string;
}

/**
 * Interface for the result of converting a class to abstract
 */
export interface ConversionResult {
    interfaceClass: string;
    concreteClass: string;
}

/**
 * Parses Dart code and converts a concrete class to abstract class with interface
 */
export class DartClassParser {
    
    /**
     * Converts a Dart class to interface and implementation
     * @param dartCode The Dart code containing the class to convert
     * @param interfacePrefix Prefix for the interface name (default: "I")
     * @param implementationSuffix Suffix for the implementation class name (default: "Impl")
     * @returns ConversionResult or null if no valid class found
     */
    static convertToAbstractClass(
        dartCode: string,
        interfacePrefix: string = 'I',
        implementationSuffix: string = 'Impl'
    ): ConversionResult | null {
        // Remove comments
        const codeWithoutComments = dartCode
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Match class declaration
        const classMatch = codeWithoutComments.match(
            /class\s+(\w+)(\s+extends\s+\w+)?(\s+implements\s+[\w\s,]+)?(\s+with\s+[\w\s,]+)?\s*\{/
        );
        
        if (!classMatch) {
            return null;
        }

        const className = classMatch[1];
        
        const classBody = this.extractClassBody(dartCode, classMatch.index!);
        const methods = this.extractMethods(classBody, className);
        const properties = this.extractProperties(classBody);
        
        const interfaceName = `${interfacePrefix}${className}`;
        const implementationName = `${className}${implementationSuffix}`;
        
        const interfaceClass = this.buildInterface(interfaceName, properties, methods);
        
        const concreteClass = this.buildConcreteClass(
            implementationName,
            interfaceName,
            properties,
            methods
        );
        
        return { interfaceClass, concreteClass };
    }

    /**
     * Extracts the class body from the Dart code
     */
    private static extractClassBody(dartCode: string, classStartIndex: number): string {
        const classBodyStart = dartCode.indexOf('{', classStartIndex);
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
        
        return dartCode.substring(classBodyStart + 1, classBodyEnd);
    }

    /**
     * Extracts public methods from the class body
     */
    private static extractMethods(classBody: string, className: string): MethodInfo[] {
        const methodRegex = /^\s*(?!\/\/|\/\*|abstract)(\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)\s*(?:async\s*)?(?:=>|{)/gm;
        const methods: MethodInfo[] = [];
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
        
        return methods;
    }

    /**
     * Extracts public properties from the class body
     */
    private static extractProperties(classBody: string): PropertyInfo[] {
        const propertyRegex = /^\s*(?:final|const)?\s*(\w+(?:<[^>]+>)?)\s+(\w+)\s*(?:=|;)/gm;
        const properties: PropertyInfo[] = [];
        let match;
        
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
        
        return properties;
    }

    /**
     * Builds the interface definition
     */
    private static buildInterface(
        interfaceName: string,
        properties: PropertyInfo[],
        methods: MethodInfo[]
    ): string {
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
        
        return interfaceClass;
    }

    /**
     * Builds the concrete class implementation
     */
    private static buildConcreteClass(
        implementationName: string,
        interfaceName: string,
        properties: PropertyInfo[],
        methods: MethodInfo[]
    ): string {
        let concreteClass = `class ${implementationName} implements ${interfaceName} {\n`;
        
        // Add properties with @override
        if (properties.length > 0) {
            concreteClass += properties
                .map(p => `  @override\n  final ${p.type} ${p.name};`)
                .join('\n\n') + '\n';
            if (methods.length > 0) {
                concreteClass += '\n';
            }
        }
        
        // Add constructor if there are properties
        if (properties.length > 0) {
            const constructorParams = properties
                .map(p => `required this.${p.name}`)
                .join(', ');
            concreteClass += `  ${implementationName}({${constructorParams}});\n`;
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
        
        return concreteClass;
    }
}