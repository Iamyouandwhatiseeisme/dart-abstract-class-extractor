import * as os from "os";
import * as path from "path";
import * as self from "./dartClassParser";

export class DartExtractorResolver {
  private static readonly BINARY_MAP: Record<string, string> = {
    win32: "ast_extractor_windows.exe",
    darwin: "ast_extractor.exe",
    linux: "ast_extractor.exe",
  };

  static getExtractorPath(): string {
    const platform = os.platform();
    const binaryName = this.BINARY_MAP[platform];

    if (!binaryName) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const extensionRoot = path.resolve(__dirname, "../");
    return path.join(extensionRoot, binaryName);
  }

  static writeTempFile(dartSource: string): string {
    const tmpFile = path.join(os.tmpdir(), "dart_parser_input.dart");
    self.writeFileSync(tmpFile, dartSource, "utf8");
    return tmpFile;
  }
}
