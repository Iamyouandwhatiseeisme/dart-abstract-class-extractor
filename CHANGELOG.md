# Changelog

All notable changes to **Dart Abstract Class Extractor** will be documented in this file.

---

## [0.4.0] — 2026-02-12

### Fixed
- Resolved Windows compatibility issue where `ast_extractor.exe` failed to run due to architecture mismatch
- Extension now bundles platform-specific binaries for both Windows (`ast_extractor_windows.exe`) and macOS (`ast_extractor_macos`)
- Binary is selected automatically at runtime based on the user's operating system
- macOS binary is granted executable permissions automatically on activation

---

## [0.3.0]

### Changed
- Switched AST extraction from an in-process Dart SDK call to a compiled standalone executable
- `ast_extractor` is now bundled directly with the extension — users no longer need the Dart SDK installed

### Improved
- Maintains full support for fields, getters, methods, constructors, async/stream functions, and nested generics
- Faster startup and more predictable execution across environments

---

## [0.2.0]

### Changed
- Migrated parsing engine from TypeScript + regex to the **Dart Analyzer AST** for significantly more accurate and stable results

### Added
- Generates getters for fields and computed properties in abstract classes
- Implementation classes now include `@override` annotations and constructor initialization for fields
- Full support for `async` methods, streams, and nested generics

---

## [0.1.0]

### Added
- Initial release of Dart Abstract Class Extractor
- Convert concrete Dart classes into an abstract interface + implementation pair
- Preserves original method bodies in the generated implementation class
- Supports both block-body (`{}`) and arrow-function (`=>`) methods
- Automatically excludes private members from the generated interface