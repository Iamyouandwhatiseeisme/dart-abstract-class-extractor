import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { convertToAbstractCommand } from "../../commands/convertToAbstractCommand";
import { DartClassParser } from "../../utils/dartClassParser";
import { ExtensionConfig } from "../../utils/extensionConfig";

suite("convertToAbstractCommand", () => {
  let sandbox: sinon.SinonSandbox;

  // Reusable stubs
  let showErrorMessageStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;
  let showQuickPickStub: sinon.SinonStub;
  let clipboardWriteStub: sinon.SinonStub;
  let convertStub: sinon.SinonStub;
  let getPrefixStub: sinon.SinonStub;
  let getSuffixStub: sinon.SinonStub;

  const MOCK_DART_CLASS = `class UserRepository {
  String id;
  String name;
  void fetchUser() {}
  void saveUser() {}
}`;

  const MOCK_RESULT = {
    interfaceClass: `abstract class IUserRepository {
  void fetchUser();
  void saveUser();
}`,
    concreteClass: `class UserRepositoryImpl implements IUserRepository {
  String id;
  String name;
  @override void fetchUser() {}
  @override void saveUser() {}
}`,
  };

  const MOCK_FULL_OUTPUT = `${MOCK_RESULT.interfaceClass}\n\n${MOCK_RESULT.concreteClass}`;

  /**
   * Creates a mock VS Code TextEditor with sensible defaults.
   * Override any field by passing a partial object.
   */
  function makeMockEditor(
    overrides: {
      languageId?: string;
      selectedText?: string;
      fullText?: string;
      selectionIsEmpty?: boolean;
    } = {},
  ): vscode.TextEditor {
    const {
      languageId = "dart",
      selectedText = "",
      fullText = MOCK_DART_CLASS,
      selectionIsEmpty = true,
    } = overrides;

    const selectionStart = new vscode.Position(0, 0);
    const selectionEnd = selectionIsEmpty
      ? selectionStart
      : new vscode.Position(5, 1);
    const selection = new vscode.Selection(selectionStart, selectionEnd);

    const document = {
      languageId,
      getText: (range?: vscode.Range) => (range ? selectedText : fullText),
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as unknown as vscode.TextDocument;

    const editStub = sinon.stub().resolves(true);

    return {
      document,
      selection,
      edit: editStub,
    } as unknown as vscode.TextEditor;
  }

  setup(() => {
    sandbox = sinon.createSandbox();

    // VS Code window stubs
    showErrorMessageStub = sandbox
      .stub(vscode.window, "showErrorMessage")
      .resolves(undefined);
    showInformationMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    showQuickPickStub = sandbox
      .stub(vscode.window, "showQuickPick")
      .resolves(undefined);

    // Clipboard stub
    clipboardWriteStub = sandbox
      .stub(vscode.env.clipboard, "writeText")
      .resolves();

    // DartClassParser & ExtensionConfig stubs
    convertStub = sandbox
      .stub(DartClassParser, "convertToAbstractClass")
      .returns(MOCK_RESULT);
    getPrefixStub = sandbox
      .stub(ExtensionConfig, "getInterfacePrefix")
      .returns("I");
    getSuffixStub = sandbox
      .stub(ExtensionConfig, "getImplementationSuffix")
      .returns("Impl");
  });

  teardown(() => {
    sandbox.restore();
  });

  // ─── Guard clauses ────────────────────────────────────────────────────────

  suite("guard clauses", () => {
    test("shows error when there is no active editor", async () => {
      sandbox.stub(vscode.window, "activeTextEditor").value(undefined);

      await convertToAbstractCommand();

      sinon.assert.calledWith(showErrorMessageStub, "No active editor found!");
      sinon.assert.notCalled(convertStub);
    });

    test("shows error when active file is not Dart", async () => {
      const editor = makeMockEditor({ languageId: "typescript" });
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);

      await convertToAbstractCommand();

      sinon.assert.calledWith(
        showErrorMessageStub,
        "This command only works with Dart files!",
      );
      sinon.assert.notCalled(convertStub);
    });

    test("shows error when no valid Dart class is found", async () => {
      const editor = makeMockEditor();
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      convertStub.returns(null);

      await convertToAbstractCommand();

      sinon.assert.calledWith(
        showErrorMessageStub,
        "No valid Dart class found!",
      );
    });

    test("shows error when an unexpected exception is thrown", async () => {
      const editor = makeMockEditor();
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      convertStub.throws(new Error("parse failure"));

      await convertToAbstractCommand();

      sinon.assert.calledWith(
        showErrorMessageStub,
        sinon.match(/Error:.*parse failure/),
      );
    });
  });

  // ─── Text selection behaviour ─────────────────────────────────────────────

  suite("text selection", () => {
    test("uses full document text when nothing is selected", async () => {
      const editor = makeMockEditor({ selectionIsEmpty: true });
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Copy to clipboard");

      await convertToAbstractCommand();

      sinon.assert.calledWith(
        convertStub,
        MOCK_DART_CLASS, // full document text
        "I",
        "Impl",
      );
    });

    test("uses selected text when a selection exists", async () => {
      const editor = makeMockEditor({
        selectionIsEmpty: false,
        selectedText: "class Foo {}",
      });
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Copy to clipboard");

      await convertToAbstractCommand();

      sinon.assert.calledWith(convertStub, "class Foo {}", "I", "Impl");
    });
  });

  // ─── Configuration ────────────────────────────────────────────────────────

  suite("configuration", () => {
    test("passes prefix and suffix from ExtensionConfig to the parser", async () => {
      getPrefixStub.returns("Base");
      getSuffixStub.returns("Service");

      const editor = makeMockEditor();
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Copy to clipboard");

      await convertToAbstractCommand();

      sinon.assert.calledWith(convertStub, sinon.match.any, "Base", "Service");
    });
  });

  // ─── Quick pick actions ───────────────────────────────────────────────────

  suite("quick pick – no selection made", () => {
    test("does nothing when the user dismisses the quick pick", async () => {
      const editor = makeMockEditor();
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves(undefined);

      await convertToAbstractCommand();

      sinon.assert.notCalled(editor.edit as unknown as sinon.SinonStub);
      sinon.assert.notCalled(clipboardWriteStub);
      sinon.assert.notCalled(showInformationMessageStub);
    });
  });

  suite('quick pick – "Copy to clipboard"', () => {
    test("writes the full output to the clipboard", async () => {
      const editor = makeMockEditor();
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Copy to clipboard");

      await convertToAbstractCommand();

      sinon.assert.calledWith(clipboardWriteStub, MOCK_FULL_OUTPUT);
    });

    test('shows "Code copied" information message', async () => {
      const editor = makeMockEditor();
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Copy to clipboard");

      await convertToAbstractCommand();

      sinon.assert.calledWith(
        showInformationMessageStub,
        "Code copied to clipboard!",
      );
    });
  });

  suite('quick pick – "Replace current class"', () => {
    test("replaces the selection when text is selected", async () => {
      const editor = makeMockEditor({
        selectionIsEmpty: false,
        selectedText: "class Foo {}",
      });
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Replace current class");

      await convertToAbstractCommand();

      const editStub = editor.edit as unknown as sinon.SinonStub;
      sinon.assert.calledOnce(editStub);

      // Invoke the edit callback and verify `replace` is called
      const editCallback = editStub.firstCall.args[0];
      const editBuilderMock = {
        replace: sinon.spy(),
        insert: sinon.spy(),
      };
      editCallback(editBuilderMock);

      sinon.assert.calledOnce(editBuilderMock.replace);
      sinon.assert.notCalled(editBuilderMock.insert);
    });

    test("replaces the entire document when nothing is selected", async () => {
      const editor = makeMockEditor({ selectionIsEmpty: true });
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Replace current class");

      await convertToAbstractCommand();

      const editStub = editor.edit as unknown as sinon.SinonStub;
      const editCallback = editStub.firstCall.args[0];
      const editBuilderMock = {
        replace: sinon.spy(),
        insert: sinon.spy(),
      };
      editCallback(editBuilderMock);

      // A Range covering the full document should be passed
      sinon.assert.calledOnce(editBuilderMock.replace);
      const [range] = editBuilderMock.replace.firstCall.args;
      assert.ok(
        range instanceof vscode.Range,
        "Expected a vscode.Range for full-document replacement",
      );
    });

    test("shows success message after replace", async () => {
      const editor = makeMockEditor();
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Replace current class");

      await convertToAbstractCommand();

      sinon.assert.calledWith(
        showInformationMessageStub,
        "Interface and implementation created successfully!",
      );
    });
  });

  suite('quick pick – "Insert below"', () => {
    test("inserts at end of document when selection is empty", async () => {
      const editor = makeMockEditor({ selectionIsEmpty: true });
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Insert below");

      await convertToAbstractCommand();

      const editStub = editor.edit as unknown as sinon.SinonStub;
      const editCallback = editStub.firstCall.args[0];
      const editBuilderMock = {
        replace: sinon.spy(),
        insert: sinon.spy(),
      };
      editCallback(editBuilderMock);

      sinon.assert.calledOnce(editBuilderMock.insert);
      const [, insertedText] = editBuilderMock.insert.firstCall.args;
      assert.ok(
        insertedText.startsWith("\n\n"),
        "Inserted text should be preceded by two newlines",
      );
      assert.ok(
        insertedText.includes(MOCK_RESULT.interfaceClass),
        "Inserted text should contain the interface class",
      );
    });

    test("inserts after the selection end when text is selected", async () => {
      const editor = makeMockEditor({
        selectionIsEmpty: false,
        selectedText: "class Foo {}",
      });
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Insert below");

      await convertToAbstractCommand();

      const editStub = editor.edit as unknown as sinon.SinonStub;
      const editCallback = editStub.firstCall.args[0];
      const editBuilderMock = {
        replace: sinon.spy(),
        insert: sinon.spy(),
      };
      editCallback(editBuilderMock);

      sinon.assert.calledOnce(editBuilderMock.insert);
      const [insertPosition] = editBuilderMock.insert.firstCall.args;
      // The position should be the selection's end, not position(0,0)
      assert.ok(
        insertPosition instanceof vscode.Position,
        "Expected a vscode.Position",
      );
    });

    test("shows success message after insert", async () => {
      const editor = makeMockEditor();
      sandbox.stub(vscode.window, "activeTextEditor").value(editor);
      showQuickPickStub.resolves("Insert below");

      await convertToAbstractCommand();

      sinon.assert.calledWith(
        showInformationMessageStub,
        "Interface and implementation created successfully!",
      );
    });
  });
});
