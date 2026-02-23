export class DartClassWarningCollector {
  static collect(mainClass: any, className: string): string[] {
    const warnings: string[] = [];

    const privateFields = (mainClass.fields || []).filter((f: any) =>
      f.name.startsWith("_"),
    );

    const hasSetters = (mainClass.methods || []).some((m: any) => m.isSetter);

    if (privateFields.length > 0) {
      warnings.push(
        `Class "${className}" contains private fields (${privateFields.map((f: any) => f.name).join(", ")}) which will be omitted from the interface.`,
      );
    }

    if (hasSetters) {
      warnings.push(
        `Class "${className}" contains setters which are not supported and will be omitted.`,
      );
    }

    return warnings;
  }
}
