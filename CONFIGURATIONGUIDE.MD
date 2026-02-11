# Customizing Interface and Implementation Names

## How to Configure

You can customize the prefix and suffix for generated class names in VS Code settings.

### Method 1: Settings UI

1. Press `Ctrl + ,` (or `Cmd + ,` on Mac) to open Settings
2. Search for "Flutter Clean Code"
3. You'll see two settings:
   - **Interface Prefix**: Prefix for interface names (default: "I")
   - **Implementation Suffix**: Suffix for implementation names (default: "Impl")

### Method 2: Settings JSON

1. Press `Ctrl + Shift + P` and search for "Preferences: Open User Settings (JSON)"
2. Add the following:

```json
{
  "flutterCleanCode.interfacePrefix": "I",
  "flutterCleanCode.implementationSuffix": "Impl"
}
```

## Examples

### Default Settings
```json
{
  "flutterCleanCode.interfacePrefix": "I",
  "flutterCleanCode.implementationSuffix": "Impl"
}
```

**Input class:** `UserService`
**Generated:**
- Interface: `IUserService`
- Implementation: `UserServiceImpl`

---

### Custom: No prefix, "Concrete" suffix
```json
{
  "flutterCleanCode.interfacePrefix": "",
  "flutterCleanCode.implementationSuffix": "Concrete"
}
```

**Input class:** `UserService`
**Generated:**
- Interface: `UserService`
- Implementation: `UserServiceConcrete`

---

### Custom: "Abstract" prefix, "Implementation" suffix
```json
{
  "flutterCleanCode.interfacePrefix": "Abstract",
  "flutterCleanCode.implementationSuffix": "Implementation"
}
```

**Input class:** `UserService`
**Generated:**
- Interface: `AbstractUserService`
- Implementation: `UserServiceImplementation`

---

### Custom: "Base" prefix, empty suffix
```json
{
  "flutterCleanCode.interfacePrefix": "Base",
  "flutterCleanCode.implementationSuffix": ""
}
```

**Input class:** `UserService`
**Generated:**
- Interface: `BaseUserService`
- Implementation: `UserService`

## Tips

- Leave prefix/suffix empty (`""`) if you don't want one
- Changes take effect immediately - no need to reload VS Code
- Settings are per-user, so each developer can use their own naming convention