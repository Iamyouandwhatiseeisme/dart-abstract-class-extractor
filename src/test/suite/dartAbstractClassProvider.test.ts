import * as sinon from "sinon";
import * as vscode from "vscode";

import { DartAbstractClassProvider } from "../../providers/dartAbstractClassProvider";

suite("DartAbstractClassProvider", () => {
  let sandbox: sinon.SinonSandbox;
  let provider: DartAbstractClassProvider;

  /**
   * Creates a mock TextDocument with sensible defaults.
   */
  function makeMockDocument(
    overrides: {
      text?: string;
    } = {},
  ): vscode.TextDocument {
    const { text = "" } = overrides;

    return {
      getText: () => text,
    } as unknown as vscode.TextDocument;
  }

  /**
   * Creates a minimal stub for the unused-but-required provideCodeActions args.
   */
  function makeUnusedArgs(): {
    range: vscode.Range;
    context: vscode.CodeActionContext;
    token: vscode.CancellationToken;
  } {
    return {
      range: new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(0, 0),
      ),
      context: {
        diagnostics: [],
        triggerKind: vscode.CodeActionTriggerKind.Invoke,
        only: undefined,
      },
      token: {
        isCancellationRequested: false,
        onCancellationRequested: sinon.stub(),
      } as unknown as vscode.CancellationToken,
    };
  }

  setup(() => {
    sandbox = sinon.createSandbox();
    provider = new DartAbstractClassProvider();
  });

  teardown(() => {
    sandbox.restore();
  });

  // ─── Guard clauses ────────────────────────────────────────────────────────

  suite("guard clauses", () => {
    test("returns undefined when the document contains no class", () => {
      const document = makeMockDocument({ text: "void main() {}" });
      const { range, context, token } = makeUnusedArgs();

      const result = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      );

      sinon.assert.match(result, undefined);
    });

    test("returns undefined for an empty document", () => {
      const document = makeMockDocument({ text: "" });
      const { range, context, token } = makeUnusedArgs();

      const result = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      );

      sinon.assert.match(result, undefined);
    });
  });

  // ─── Action shape ─────────────────────────────────────────────────────────

  suite("returned action", () => {
    test("returns exactly one code action when a class is present", () => {
      const document = makeMockDocument({ text: "class Foo {}" });
      const { range, context, token } = makeUnusedArgs();

      const result = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      );

      sinon.assert.match(result?.length, 1);
    });

    test("action has the correct title", () => {
      const document = makeMockDocument({ text: "class Foo {}" });
      const { range, context, token } = makeUnusedArgs();

      const [action] = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      )!;

      sinon.assert.match(action.title, "Convert to Abstract Class");
    });

    test("action has RefactorRewrite kind", () => {
      const document = makeMockDocument({ text: "class Foo {}" });
      const { range, context, token } = makeUnusedArgs();

      const [action] = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      )!;

      sinon.assert.match(action.kind, vscode.CodeActionKind.RefactorRewrite);
    });

    test("action command targets the correct command ID", () => {
      const document = makeMockDocument({ text: "class Foo {}" });
      const { range, context, token } = makeUnusedArgs();

      const [action] = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      )!;

      sinon.assert.match(
        action.command?.command,
        "dart-abstract-class-extractor.convertToAbstract",
      );
    });

    test("action command has the correct title", () => {
      const document = makeMockDocument({ text: "class Foo {}" });
      const { range, context, token } = makeUnusedArgs();

      const [action] = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      )!;

      sinon.assert.match(action.command?.title, "Convert to Abstract Class");
    });
  });

  // ─── class keyword detection ──────────────────────────────────────────────

  suite("class keyword detection", () => {
    test("detects a class with fields and methods", () => {
      const document = makeMockDocument({
        text: `class UserRepository {\n  String id;\n  void fetch() {}\n}`,
      });
      const { range, context, token } = makeUnusedArgs();

      const result = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      );

      sinon.assert.match(result?.length, 1);
    });

    test("detects an abstract class", () => {
      const document = makeMockDocument({ text: "abstract class IFoo {}" });
      const { range, context, token } = makeUnusedArgs();

      const result = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      );

      sinon.assert.match(result?.length, 1);
    });

    test("detects when 'class' appears in a comment", () => {
      // The current implementation does a simple string include check,
      // so a comment containing 'class ' still triggers the action.
      const document = makeMockDocument({ text: "// This class is abstract" });
      const { range, context, token } = makeUnusedArgs();

      const result = provider.provideCodeActions(
        document,
        range,
        context,
        token,
      );

      sinon.assert.match(result?.length, 1);
    });
  });
});
