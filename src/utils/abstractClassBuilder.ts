export class DartAbstractClassBuilder {
  static build(mainClass: any, interfaceName: string): string {
    const abstractLines: string[] = [];

    (mainClass.fields || [])
      .filter((f: any) => !f.name.startsWith("_"))
      .forEach((f: any) => {
        abstractLines.push(`  ${f.type} get ${f.name};`);
      });

    (mainClass.methods || [])
      .filter((m: any) => m.isGetter)
      .forEach((g: any) => {
        abstractLines.push(`  ${g.returnType} get ${g.name};`);
      });

    (mainClass.methods || [])
      .filter((m: any) => !m.isGetter && !m.isSetter)
      .forEach((m: any) => {
        abstractLines.push(`  ${m.returnType} ${m.name}${m.params};`);
      });

    return `
abstract class ${interfaceName} {
${abstractLines.join("\n")}
}
`.trim();
  }
}
