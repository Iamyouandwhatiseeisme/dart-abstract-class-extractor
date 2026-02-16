import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';

void main(List<String> args) {
  if (args.isEmpty) {
    stderr.writeln('No file provided');
    exit(1);
  }

  final content = File(args[0]).readAsStringSync();
  final unit = parseString(content: content).unit;
  final classes = unit.declarations.whereType<ClassDeclaration>().map(parseClass).toList();

  print(jsonEncode(classes));
}

Map<String, dynamic> parseClass(ClassDeclaration decl) => {
      "name": decl.name.lexeme,
      "methods": decl.members.whereType<MethodDeclaration>().map(parseMethod).toList(),
      "fields": decl.members.whereType<FieldDeclaration>().expand(parseField).toList(),
    };

Map<String, dynamic> parseMethod(MethodDeclaration member) => {
      "name": member.name.lexeme,
      "returnType": member.returnType?.toSource() ?? "dynamic",
      "isAsync": member.body.isAsynchronous,
      "isGetter": member.isGetter,
      "isSetter": member.isSetter,
      "isStatic": member.isStatic,
      "params": member.parameters?.toSource() ?? "",
      "body": member.body.toSource(),
    };

Iterable<Map<String, dynamic>> parseField(FieldDeclaration member) {
  final type = member.fields.type?.toSource() ?? "dynamic";
  final isFinal = member.fields.isFinal;

  return member.fields.variables.map((v) => {
        "name": v.name.lexeme,
        "type": type,
        "isFinal": isFinal,
      });
}
