# Custom Syntax Highlighting

⚠️ **IMPORTANT:** This syntax file is **manually maintained** and should **NOT** be regenerated!

## Why?

The `sellhub-liquid.tmLanguage.json` file in this directory is a custom TextMate grammar that provides comprehensive syntax highlighting for Sellhub Liquid templates.

Langium can auto-generate basic syntax highlighting, but it doesn't support the complex patterns we need for:

- Proper Liquid tag highlighting ({% %})
- Liquid output highlighting ({{ }})
- Island component syntax
- HTML mixed with Liquid
- Filters and operators
- Comments

## Changes Made

1. **Disabled auto-generation** in `langium-config.json`:
   - Removed the `textMate` section to prevent overwriting

2. **Created custom grammar** with comprehensive highlighting:
   - Liquid tags (`{% %}`)
   - Liquid output (`{{ }}`)
   - Island-specific keywords (`island`, `endisland`, `props`, `hydrate`)
   - Control flow keywords (`if`, `for`, `case`, etc.)
   - Variables and property access
   - Filters (`| filter_name`)
   - Strings, numbers, booleans
   - Operators and comparisons
   - HTML tags and attributes
   - Comments

## If You Need to Modify

To update the syntax highlighting:

1. Edit `sellhub-liquid.tmLanguage.json` directly
2. Test your changes in VSCode
3. Commit the updated file

## DO NOT Run

❌ **DO NOT** re-enable `textMate` generation in `langium-config.json`
❌ **DO NOT** delete this syntax file
❌ **DO NOT** run commands that regenerate TextMate grammars

## Testing Changes

After modifying the syntax file:

1. Rebuild the extension:

   ```bash
   npm run build
   ```

2. Reload VSCode window:
   - Press F5 to reload Extension Development Host
   - Or: Ctrl+Shift+P → "Reload Window"

3. Open a `.liquid` file and verify highlighting

## References

- [TextMate Grammar Guide](https://macromates.com/manual/en/language_grammars)
- [VSCode Syntax Highlighting Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)
- [Scope Naming](https://www.sublimetext.com/docs/scope_naming.html)
