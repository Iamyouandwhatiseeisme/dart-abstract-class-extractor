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
