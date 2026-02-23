import * as self from "./dartClassParser";

export class DartAstExtractor {
  static extract(extractorPath: string, tmpFile: string): string {
    try {
      return self.execSyncWrapper(`${extractorPath} ${tmpFile}`, {
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
  }
}
