import { DartClassWarningCollector } from "./warnings/dartClassWarningCollector";

export class DartClassResolver {
  static resolve(
    output: string,
    interfacePrefix: string,
    implementationSuffix: string,
  ) {
    const classes = JSON.parse(output);
    if (!classes.length) return null;

    const mainClass = classes[0];
    const className = mainClass.name;
    const warnings = DartClassWarningCollector.collect(mainClass, className);

    return {
      mainClass,
      className,
      interfaceName: `${interfacePrefix}${className}`,
      implName: `${className}${implementationSuffix}`,
      warnings,
    };
  }
}
