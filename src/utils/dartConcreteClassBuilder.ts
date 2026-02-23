export class DartConcreteClassBuilder {
  static build(
    mainClass: any,
    implName: string,
    interfaceName: string,
  ): string {
    const implLines: string[] = [];

    (mainClass.fields || [])
      .filter((f: any) => !f.name.startsWith("_"))
      .forEach((f: any) => {
        implLines.push(`  @override\n  final ${f.type} ${f.name};`);
      });

    (mainClass.methods || [])
      .filter((m: any) => m.isGetter)
      .forEach((g: any) => {
        implLines.push(
          `  @override\n  ${g.returnType} get ${g.name} ${g.body}`,
        );
      });

    (mainClass.methods || [])
      .filter((m: any) => !m.isGetter && !m.isSetter)
      .forEach((m: any) => {
        implLines.push(
          `  @override\n  ${m.returnType} ${m.name}${m.params} ${m.body}`,
        );
      });

    const fields =
      mainClass.fields || [].filter((f: any) => !f.name.startsWith("_"));
    const ctorParams = fields.map((f: any) => `this.${f.name}`).join(", ");
    const constructor = fields.length ? `\n  ${implName}(${ctorParams});` : "";

    return `
class ${implName} implements ${interfaceName} {
${constructor}\n\n${implLines.join("\n\n")}
}
`.trim();
  }
}
