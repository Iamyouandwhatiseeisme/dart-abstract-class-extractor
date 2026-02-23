import { execSync } from "child_process";
import * as fs from "fs";
import { DartAbstractClassBuilder } from "./abstractClassBuilder";
import { DartAstExtractor } from "./dartAstExtractor";
import { DartClassResolver } from "./dartClassResolver";
import { DartConcreteClassBuilder } from "./dartConcreteClassBuilder";
import { DartExtractorResolver } from "./dartExtractorResolver";

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
    const tmpFile = DartExtractorResolver.writeTempFile(dartSource);
    const extractorPath = DartExtractorResolver.getExtractorPath();

    // 2. Call Dart AST extractor
    const output = DartAstExtractor.extract(extractorPath, tmpFile);

    // 3. Parse JSON AST
    const resolved = DartClassResolver.resolve(
      output,
      interfacePrefix,
      implementationSuffix,
    );
    if (!resolved) return null;

    const { mainClass, className, interfaceName, implName, warnings } =
      resolved;

    // ---- ABSTRACT CLASS ----
    const interfaceClass = DartAbstractClassBuilder.build(
      mainClass,
      interfaceName,
    );

    // ---- IMPLEMENTATION CLASS ----
    const concreteClass = DartConcreteClassBuilder.build(
      mainClass,
      implName,
      interfaceName,
    );

    return {
      interfaceClass,
      concreteClass,
      warnings: warnings,
    };
  }
}

export function writeFileSync(
  path: string,
  data: string,
  encoding: BufferEncoding,
): void {
  fs.writeFileSync(path, data, encoding);
}
export function execSyncWrapper(cmd: string, options: any): string {
  return execSync(cmd, options) as string;
}
