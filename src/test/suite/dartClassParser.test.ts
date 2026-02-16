import * as assert from "assert";
import * as sinon from "sinon";

import * as DartClassParserModule from "../../utils/dartClassParser";
const { DartClassParser } = DartClassParserModule;

suite("DartClassParser", () => {
  let sandbox: sinon.SinonSandbox;
  let writeFileSyncStub: sinon.SinonStub;
  let execSyncStub: sinon.SinonStub;

  /**
   * Builds the JSON payload that the AST extractor binary would emit,
   * keeping test cases focused on the parser logic rather than JSON structure.
   */
  function makeAstPayload(overrides: {
    name?: string;
    fields?: { name: string; type: string }[];
    methods?: {
      name: string;
      returnType: string;
      params: string;
      body: string;
      isGetter?: boolean;
      isSetter?: boolean;
    }[];
  }): string {
    const { name = "UserRepository", fields = [], methods = [] } = overrides;

    return JSON.stringify([
      {
        name,
        fields,
        methods: methods.map((m) => ({
          isGetter: false,
          isSetter: false,
          ...m,
        })),
      },
    ]);
  }

  setup(() => {
    sandbox = sinon.createSandbox();
    writeFileSyncStub = sandbox.stub(DartClassParserModule, "writeFileSync");

    execSyncStub = sandbox.stub(DartClassParserModule, "execSyncWrapper");
  });

  teardown(() => {
    sandbox.restore();
  });

  // ─── Guard clauses ────────────────────────────────────────────────────────

  suite("guard clauses", () => {
    test("returns null when the AST extractor returns no classes", () => {
      execSyncStub.returns(JSON.stringify([]));

      const result = DartClassParser.convertToAbstractClass(
        "class Foo {}",
        "I",
        "Impl",
      );

      assert.strictEqual(result, null);
    });

    test("throws when the AST extractor process fails", () => {
      const err: any = new Error("binary not found");
      err.stderr = "some stderr output";
      execSyncStub.throws(err);

      assert.throws(
        () =>
          DartClassParser.convertToAbstractClass("class Foo {}", "I", "Impl"),
        (thrown: Error) => thrown.message.includes("Dart AST parser failed"),
      );
    });

    test("includes stderr in the thrown error message", () => {
      const err: any = new Error("exit 1");
      err.stderr = "unexpected token";
      execSyncStub.throws(err);

      assert.throws(
        () =>
          DartClassParser.convertToAbstractClass("class Foo {}", "I", "Impl"),
        (thrown: Error) => thrown.message.includes("unexpected token"),
      );
    });
  });

  // ─── Filesystem interaction ───────────────────────────────────────────────

  suite("filesystem", () => {
    test("writes the dart source to a temp file before invoking the binary", () => {
      execSyncStub.returns(makeAstPayload({ name: "Foo" }));

      DartClassParser.convertToAbstractClass("class Foo {}", "I", "Impl");

      sinon.assert.calledOnce(writeFileSyncStub);
      const [_, writtenContent] = writeFileSyncStub.firstCall.args;
      assert.strictEqual(writtenContent, "class Foo {}");
    });

    test("passes the temp file path to execSync", () => {
      execSyncStub.returns(makeAstPayload({ name: "Foo" }));

      DartClassParser.convertToAbstractClass("class Foo {}", "I", "Impl");

      sinon.assert.calledOnce(execSyncStub);
      const [cmd] = execSyncStub.firstCall.args;
      const [writtenPath] = writeFileSyncStub.firstCall.args;
      assert.ok(
        cmd.includes(writtenPath),
        "execSync command should include the temp file path",
      );
    });
  });

  // ─── Naming ───────────────────────────────────────────────────────────────

  suite("naming", () => {
    test("applies the interface prefix to the abstract class name", () => {
      execSyncStub.returns(makeAstPayload({ name: "UserRepository" }));

      const result = DartClassParser.convertToAbstractClass(
        "class UserRepository {}",
        "I",
        "Impl",
      )!;

      assert.ok(
        result.interfaceClass.includes("abstract class IUserRepository"),
      );
    });

    test("applies the implementation suffix to the concrete class name", () => {
      execSyncStub.returns(makeAstPayload({ name: "UserRepository" }));

      const result = DartClassParser.convertToAbstractClass(
        "class UserRepository {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.concreteClass.includes("class UserRepositoryImpl"));
    });

    test("concrete class implements the interface", () => {
      execSyncStub.returns(makeAstPayload({ name: "UserRepository" }));

      const result = DartClassParser.convertToAbstractClass(
        "class UserRepository {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.concreteClass.includes("implements IUserRepository"));
    });

    test("honours a custom prefix and suffix", () => {
      execSyncStub.returns(makeAstPayload({ name: "PaymentService" }));

      const result = DartClassParser.convertToAbstractClass(
        "class PaymentService {}",
        "Base",
        "Service",
      )!;

      assert.ok(
        result.interfaceClass.includes("abstract class BasePaymentService"),
      );
      assert.ok(result.concreteClass.includes("class PaymentServiceService"));
    });
  });

  // ─── Fields ───────────────────────────────────────────────────────────────

  suite("fields", () => {
    test("emits a getter signature in the abstract class for each field", () => {
      execSyncStub.returns(
        makeAstPayload({
          name: "User",
          fields: [{ name: "id", type: "String" }],
        }),
      );

      const result = DartClassParser.convertToAbstractClass(
        "class User {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.interfaceClass.includes("String get id;"));
    });

    test("emits a final @override field in the concrete class for each field", () => {
      execSyncStub.returns(
        makeAstPayload({
          name: "User",
          fields: [{ name: "id", type: "String" }],
        }),
      );

      const result = DartClassParser.convertToAbstractClass(
        "class User {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.concreteClass.includes("@override"));
      assert.ok(result.concreteClass.includes("final String id;"));
    });

    test("generates a constructor with all field params in the concrete class", () => {
      execSyncStub.returns(
        makeAstPayload({
          name: "User",
          fields: [
            { name: "id", type: "String" },
            { name: "name", type: "String" },
          ],
        }),
      );

      const result = DartClassParser.convertToAbstractClass(
        "class User {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.concreteClass.includes("UserImpl(this.id, this.name);"));
    });

    test("omits the constructor when there are no fields", () => {
      execSyncStub.returns(makeAstPayload({ name: "Empty", fields: [] }));

      const result = DartClassParser.convertToAbstractClass(
        "class Empty {}",
        "I",
        "Impl",
      )!;

      assert.ok(!result.concreteClass.includes("EmptyImpl("));
    });
  });

  // ─── Methods ──────────────────────────────────────────────────────────────

  suite("methods", () => {
    test("emits an abstract method signature in the interface", () => {
      execSyncStub.returns(
        makeAstPayload({
          name: "Repo",
          methods: [
            { name: "fetchUser", returnType: "void", params: "()", body: "{}" },
          ],
        }),
      );

      const result = DartClassParser.convertToAbstractClass(
        "class Repo {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.interfaceClass.includes("void fetchUser();"));
    });

    test("emits an @override method in the concrete class", () => {
      execSyncStub.returns(
        makeAstPayload({
          name: "Repo",
          methods: [
            { name: "fetchUser", returnType: "void", params: "()", body: "{}" },
          ],
        }),
      );

      const result = DartClassParser.convertToAbstractClass(
        "class Repo {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.concreteClass.includes("@override"));
      assert.ok(result.concreteClass.includes("void fetchUser() {}"));
    });

    test("excludes setters from the interface", () => {
      execSyncStub.returns(
        makeAstPayload({
          name: "Repo",
          methods: [
            {
              name: "value",
              returnType: "void",
              params: "(String v)",
              body: "{}",
              isSetter: true,
            },
          ],
        }),
      );

      const result = DartClassParser.convertToAbstractClass(
        "class Repo {}",
        "I",
        "Impl",
      )!;

      assert.ok(!result.interfaceClass.includes("set value"));
    });

    test("emits a getter signature in the interface for getter methods", () => {
      execSyncStub.returns(
        makeAstPayload({
          name: "Repo",
          methods: [
            {
              name: "count",
              returnType: "int",
              params: "",
              body: "=> _count;",
              isGetter: true,
            },
          ],
        }),
      );

      const result = DartClassParser.convertToAbstractClass(
        "class Repo {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.interfaceClass.includes("int get count;"));
    });

    test("preserves the getter body in the concrete class", () => {
      execSyncStub.returns(
        makeAstPayload({
          name: "Repo",
          methods: [
            {
              name: "count",
              returnType: "int",
              params: "",
              body: "=> _count;",
              isGetter: true,
            },
          ],
        }),
      );

      const result = DartClassParser.convertToAbstractClass(
        "class Repo {}",
        "I",
        "Impl",
      )!;

      assert.ok(result.concreteClass.includes("int get count => _count;"));
    });
  });
});
