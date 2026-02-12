import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';

void main(List<String> args) {
  if (args.isEmpty) {
    stderr.writeln('No file provided');
    exit(1);
  }

  final filePath = args[0];
  final content = File(filePath).readAsStringSync();

  final result = parseString(content: content);
  final unit = result.unit;

  final classes = <Map<String, dynamic>>[];

  for (final decl in unit.declarations) {
    if (decl is ClassDeclaration) {
      final methods = <Map<String, dynamic>>[];
      final fields = <Map<String, dynamic>>[];

      for (final member in decl.members) {
        if (member is MethodDeclaration) {
          methods.add({
            "name": member.name.lexeme,
            "returnType": member.returnType?.toSource() ?? "dynamic",
            "isAsync": member.body.isAsynchronous,
            "isGetter": member.isGetter,
            "isSetter": member.isSetter,
            "isStatic": member.isStatic,
            "params": member.parameters?.toSource() ?? "",
            "body": member.body.toSource(),
          });
        }
        if (member is FieldDeclaration) {
          final type = member.fields.type?.toSource() ?? "dynamic";
          final isFinal = member.fields.isFinal;

          for (final v in member.fields.variables) {
            fields.add({
              "name": v.name.lexeme,
              "type": type,
              "isFinal": isFinal,
            });
          }
        }
      }

      classes.add({"name": decl.name.lexeme, "methods": methods, "fields": fields});
    }
  }

  print(jsonEncode(classes));
}
