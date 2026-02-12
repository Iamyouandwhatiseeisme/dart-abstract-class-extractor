// /**
//  * Interface for method information extracted from Dart code
//  */
// export interface MethodInfo {
//   signature: string;
//   returnType: string;
//   name: string;
//   params: string;
//   body: string;
// }

// /**
//  * Interface for property information extracted from Dart code
//  */
// export interface PropertyInfo {
//   type: string;
//   name: string;
// }

// /**
//  * Interface for the result of converting a class to abstract
//  */
// export interface ConversionResult {
//   interfaceClass: string;
//   concreteClass: string;
// }

// /**
//  * Parses Dart code and converts a concrete class to abstract class with interface
//  */
// export class DartClassParser {
//   /**
//    * Converts a Dart class to interface and implementation
//    * @param dartCode The Dart code containing the class to convert
//    * @param interfacePrefix Prefix for the interface name (default: "I")
//    * @param implementationSuffix Suffix for the implementation class name (default: "Impl")
//    * @returns ConversionResult or null if no valid class found
//    */
//   static convertToAbstractClass(
//     dartCode: string,
//     interfacePrefix: string = "I",
//     implementationSuffix: string = "Impl",
//   ): ConversionResult | null {
//     // Remove comments
//     const codeWithoutComments = dartCode
//       .replace(/\/\/.*$/gm, "")
//       .replace(/\/\*[\s\S]*?\*\//g, "");

//     // Match class declaration
//     const classMatch = codeWithoutComments.match(
//       /class\s+(\w+)(\s+extends\s+\w+)?(\s+implements\s+[\w\s,]+)?(\s+with\s+[\w\s,]+)?\s*\{/,
//     );

//     if (!classMatch) {
//       return null;
//     }

//     const className = classMatch[1];

//     const classBody = this.extractClassBody(dartCode, classMatch.index!);
//     const methods = this.extractMethods(classBody, className);
//     const properties = this.extractProperties(classBody, className);

//     const interfaceName = `${interfacePrefix}${className}`;
//     const implementationName = `${className}${implementationSuffix}`;

//     const interfaceClass = this.buildInterface(
//       interfaceName,
//       properties,
//       methods,
//     );

//     const concreteClass = this.buildConcreteClass(
//       implementationName,
//       interfaceName,
//       properties,
//       methods,
//     );

//     return { interfaceClass, concreteClass };
//   }

//   /**
//    * Extracts the class body from the Dart code
//    */
//   private static extractClassBody(
//     dartCode: string,
//     classStartIndex: number,
//   ): string {
//     const classBodyStart = dartCode.indexOf("{", classStartIndex);
//     let braceCount = 1;
//     let classBodyEnd = classBodyStart + 1;

//     for (let i = classBodyStart + 1; i < dartCode.length; i++) {
//       if (dartCode[i] === "{") braceCount++;
//       if (dartCode[i] === "}") braceCount--;
//       if (braceCount === 0) {
//         classBodyEnd = i;
//         break;
//       }
//     }

//     return dartCode.substring(classBodyStart + 1, classBodyEnd);
//   }

//   /**
//    * Extracts public methods from the class body
//    */
//   private static extractMethods(
//     classBody: string,
//     className: string,
//   ): MethodInfo[] {
//     const methodRegex =
//       /^\s*(?!\/\/|\/\*|abstract)\s*(?:@[\w\.]+\s*)*(?:static\s+)?(?:external\s+)?(?:factory\s+)?(?:operator\s+)?(?:(\w+(?:<[^>]+>)?)\s+)?(\w+)\s*\([^)]*\)\s*(?:async\s*)?(?:=>|{)/gm;
//     const methods: MethodInfo[] = [];
//     let match;

//     while ((match = methodRegex.exec(classBody)) !== null) {
//       const methodName = match[2];

//       // Skip constructors (exact name match)
//       if (methodName === className) continue;

//       // Skip constructor delegations like ClassName(this.x)
//       if (match[0].includes("this.")) continue;

//       // Skip private methods (starting with _)
//       if (methodName.startsWith("_")) continue;

//       const methodStart = match.index;

//       // Use extractFullType to correctly handle nested generics like Stream<Iterable<Budget>>
//       const trimmedStart =
//         methodStart + classBody.substring(methodStart).search(/\S/);
//       const returnType = this.extractFullType(classBody, trimmedStart);

//       const signatureMatch = classBody
//         .substring(methodStart)
//         .match(/^[^{;=>]*/);

//       if (signatureMatch) {
//         let signature = signatureMatch[0].trim();
//         // Remove 'async' keyword if present
//         signature = signature.replace(/\s+async\s*$/, "");

//         // Extract parameters
//         const paramsMatch = signature.match(/\(([^)]*)\)/);
//         const params = paramsMatch ? paramsMatch[1] : "";

//         const afterSignature = classBody.substring(
//           methodStart + signatureMatch[0].length,
//         );

//         const body = this.extractMethodBody(afterSignature);
//         methods.push({
//           signature,
//           returnType,
//           name: methodName,
//           params,
//           body,
//         });
//       }
//     }

//     return methods;
//   }

//   /**
//    * Extracts the body of a method from the code after the signature
//    */
//   private static extractMethodBody(codeAfterSignature: string): string {
//     const trimmed = codeAfterSignature.trimStart();

//     // Arrow function: => expression;
//     if (trimmed.startsWith("=>")) {
//       const arrowBody = trimmed.match(/^=>\s*([\s\S]*?);/);
//       return arrowBody
//         ? `=> ${arrowBody[1].trim()};`
//         : "=> throw UnimplementedError();";
//     }

//     // Block body: { ... }
//     if (trimmed.startsWith("{")) {
//       let braceCount = 0;
//       let end = 0;
//       for (let i = 0; i < trimmed.length; i++) {
//         if (trimmed[i] === "{") braceCount++;
//         if (trimmed[i] === "}") braceCount--;
//         if (braceCount === 0) {
//           end = i;
//           break;
//         }
//       }
//       return trimmed.substring(0, end + 1);
//     }

//     return "{\n    throw UnimplementedError();\n  }";
//   }

//   /**
//    * Extracts public properties from the class body
//    * @param classBody The body of the class
//    * @param className The name of the class (used to skip constructor lines)
//    */
//   private static extractProperties(
//     classBody: string,
//     className: string,
//   ): PropertyInfo[] {
//     const propertyRegex =
//       /^\s*(?:final|const)?\s*(\w+(?:<[^>]+>)?)\s+(\w+)\s*(?:=|;)/gm;
//     const properties: PropertyInfo[] = [];
//     let match;

//     while ((match = propertyRegex.exec(classBody)) !== null) {
//       const type = match[1];
//       const propName = match[2];

//       // Skip private properties
//       if (propName.startsWith("_")) continue;

//       // Skip constructor lines like ClassName(this.x)
//       if (type === className) continue;

//       // Skip keywords that are not types
//       if (["return", "final", "const", "var"].includes(type)) continue;

//       // Skip if it's inside a method body
//       const beforeMatch = classBody.substring(0, match.index);
//       const openBraces = (beforeMatch.match(/{/g) || []).length;
//       const closeBraces = (beforeMatch.match(/}/g) || []).length;

//       if (openBraces > closeBraces) continue;

//       properties.push({ type, name: propName });
//     }

//     return properties;
//   }

//   /**
//    * Builds the interface definition
//    */
//   private static buildInterface(
//     interfaceName: string,
//     properties: PropertyInfo[],
//     methods: MethodInfo[],
//   ): string {
//     let interfaceClass = `abstract class ${interfaceName} {\n`;

//     // Add properties as abstract getters in interface
//     if (properties.length > 0) {
//       interfaceClass +=
//         properties.map((p) => `  ${p.type} get ${p.name};`).join("\n") + "\n";
//       if (methods.length > 0) {
//         interfaceClass += "\n";
//       }
//     }

//     // Add abstract methods in interface
//     if (methods.length > 0) {
//       interfaceClass +=
//         methods.map((m) => `  ${m.signature};`).join("\n") + "\n";
//     }

//     interfaceClass += "}";

//     return interfaceClass;
//   }

//   /**
//    * Builds the concrete class implementation
//    */
//   private static buildConcreteClass(
//     className: string,
//     interfaceName: string,
//     properties: PropertyInfo[],
//     methods: MethodInfo[],
//   ): string {
//     let concreteClass = `class ${className} implements ${interfaceName} {\n`;

//     // Add properties with @override
//     if (properties.length > 0) {
//       concreteClass +=
//         properties
//           .map((p) => `  @override\n  final ${p.type} ${p.name};`)
//           .join("\n\n") + "\n";
//       if (methods.length > 0) {
//         concreteClass += "\n";
//       }
//     }

//     // Add constructor if there are properties
//     if (properties.length > 0) {
//       const constructorParams = properties
//         .map((p) => `required this.${p.name}`)
//         .join(", ");
//       concreteClass += `  ${className}({${constructorParams}});\n`;
//       if (methods.length > 0) {
//         concreteClass += "\n";
//       }
//     }

//     // Add methods with @override
//     if (methods.length > 0) {
//       concreteClass +=
//         methods
//           .map((m) => {
//             return `  @override\n  ${m.signature} ${m.body}`;
//           })
//           .join("\n\n") + "\n";
//     }

//     concreteClass += "}";

//     return concreteClass;
//   }

//   /**
//    * Extracts a complete type name including nested generics
//    * e.g. "Stream<Iterable<Budget>>" instead of stopping at first ">"
//    */
//   private static extractFullType(code: string, startIndex: number): string {
//     let i = startIndex;

//     // Collect the base type name (e.g. "Stream", "void", "Future")
//     while (i < code.length && /\w/.test(code[i])) i++;

//     // If no "<" follows, it's a simple type like "void" or "String"
//     if (code[i] !== "<") {
//       return code.substring(startIndex, i);
//     }

//     // Walk through nested angle brackets, tracking depth
//     let depth = 0;
//     while (i < code.length) {
//       if (code[i] === "<") depth++;
//       if (code[i] === ">") {
//         depth--;
//         if (depth === 0) {
//           i++; // include the closing ">"
//           break;
//         }
//       }
//       i++;
//     }

//     return code.substring(startIndex, i);
//   }
// }

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface MethodInfo {
  name: string;
  returnType: string;
  params: string;
  body: string;
  isAsync: boolean;
  isStatic: boolean;
  isGetter: boolean;
  isSetter: boolean;
}

export class DartClassParser {
  static convertToAbstractClass(
    dartSource: string,
    interfacePrefix: string,
    implementationSuffix: string,
  ) {
    // 1. Write temp dart file
    const tmpFile = path.join(os.tmpdir(), "dart_parser_input.dart");
    fs.writeFileSync(tmpFile, dartSource, "utf8");

    const extensionRoot = path.resolve(__dirname, "../");
    const extractorPath = path.join(extensionRoot, "ast_extractor.dart");

    // 2. Call Dart AST extractor
    let output: string;
    try {
      output = execSync(`dart ${extractorPath} ${tmpFile}`, {
        encoding: "utf8",
      });
    } catch (e: any) {
      console.error("DART ERROR:", e?.stdout);
      console.error("DART STDERR:", e?.stderr);
      throw new Error(
        "Dart AST parser failed:\n" +
          (e?.stderr?.toString() || e?.message || "Unknown Dart error"),
      );
    }

    // 3. Parse JSON AST
    const classes = JSON.parse(output);
    if (!classes.length) return null;

    const mainClass = classes[0]; // first class in file
    const className = mainClass.name;

    const interfaceName = `${interfacePrefix}${className}`;
    const implName = `${className}${implementationSuffix}`;

    // ---- ABSTRACT CLASS ----
    const abstractLines: string[] = [];

    // Fields -> getters
    (mainClass.fields || []).forEach((f: any) => {
      abstractLines.push(`  ${f.type} get ${f.name};`);
    });

    // Getters
    (mainClass.methods || [])
      .filter((m: any) => m.isGetter)
      .forEach((g: any) => {
        abstractLines.push(`  ${g.returnType} get ${g.name};`);
      });

    // Regular methods
    (mainClass.methods || [])
      .filter((m: any) => !m.isGetter && !m.isSetter)
      .forEach((m: any) => {
        abstractLines.push(`  ${m.returnType} ${m.name}${m.params};`);
      });

    const interfaceClass = `
abstract class ${interfaceName} {
${abstractLines.join("\n")}
}
`.trim();

    // ---- IMPLEMENTATION CLASS ----
    const implLines: string[] = [];

    // Fields with @override
    (mainClass.fields || []).forEach((f: any) => {
      implLines.push(`  @override\n  final ${f.type} ${f.name};`);
    });

    // Computed getters
    (mainClass.methods || [])
      .filter((m: any) => m.isGetter)
      .forEach((g: any) => {
        // body might include the => ... or { ... }
        implLines.push(
          `  @override\n  ${g.returnType} get ${g.name} ${g.body}`,
        );
      });

    // Methods
    (mainClass.methods || [])
      .filter((m: any) => !m.isGetter && !m.isSetter)
      .forEach((m: any) => {
        implLines.push(
          `  @override\n  ${m.returnType} ${m.name}${m.params} ${m.body}`,
        );
      });

    // Constructor for fields
    const fields = mainClass.fields || [];
    const ctorParams = fields.map((f: any) => `this.${f.name}`).join(", ");
    const constructor = fields.length ? `\n  ${implName}(${ctorParams});` : "";

    const concreteClass = `
class ${implName} implements ${interfaceName} {
${implLines.join("\n\n")}${constructor}
}
`.trim();

    return {
      interfaceClass,
      concreteClass,
    };
  }
}
