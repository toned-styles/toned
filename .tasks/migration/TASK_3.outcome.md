# TASK_3 Outcome: Tests and Documentation

## Summary

Added comprehensive tests for the new API and updated documentation with complete API reference.

## Tests Added

### 1. StyleSheet Tests (`packages/toned-core/StyleSheet/StyleSheet.test.ts`)

**Basic Functionality:**
- Creates stylesheet with element definitions
- Stylesheet has `SYMBOL_INIT` for initialization
- Stylesheet has `SYMBOL_REF` for system reference

**Variants Chain:**
- Variants method returns new stylesheet
- Variants can be chained multiple times

**Rule Transformation:**
- Transforms inline pseudo classes to internal format
- Transforms cross-element selectors
- Handles multiple pseudo classes in cross-element selector
- Transforms breakpoints in element styles
- Combines base rules with variant rules
- Handles combined variant selectors

**Base Class:**
- Initializes with rules and config
- Matches styles based on mods state
- `applyState` updates styles correctly

**Integration Tests:**
- Inline pseudo class affects only self element
- Cross-element pseudo affects multiple elements
- Variants apply correctly
- Combined variants work correctly

### 2. StyleMatcher Enhancement

Added `parseCombinedSelector` method to handle flat combined selectors like `[size=sm][variant=accent]`:

```typescript
private parseCombinedSelector(selector: string): Array<[string, string]> {
  const results: Array<[string, string]> = []
  const regex = /\[([^\]=]+)=([^\]]+)\]/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(selector)) !== null) {
    results.push([match[1]!, match[2]!])
  }

  return results
}
```

Updated `flattenRules` to use combined selector parsing for multi-bracket selectors.

## Documentation Added

### Updated `packages/toned-core/README.md`

Added comprehensive documentation for:

1. **Basic Usage** - Simple element definitions
2. **Pseudo Classes (Self-Styling)** - `:hover`, `:active`, `:focus` inside elements
3. **Cross-Element Pseudo Classes** - `'element:pseudo'` selectors affecting multiple elements
4. **Breakpoints** - `@sm`, `@md` responsive styles
5. **Variants** - `.variants<T>({...})` chain method
6. **Using Styles in React** - Integration example
7. **Type Safety** - What's inferred automatically
8. **API Reference** - Full reference table

### Selector Syntax Reference

| Selector | Description | Example |
|----------|-------------|---------|
| `element` | Element definition | `container: { ... }` |
| `:pseudo` | Pseudo class (self only) | `':hover': { ... }` |
| `@breakpoint` | Breakpoint (self only) | `'@sm': { ... }` |
| `element:pseudo` | Cross-element pseudo | `'container:hover': { ... }` |
| `[key=value]` | Single variant | `'[size=sm]': { ... }` |
| `[key1=val1][key2=val2]` | Combined variants | `'[size=sm][variant=primary]': { ... }` |

## Test Results

All 27 tests passing:
- 18 tests in `StyleSheet.test.ts`
- 9 tests in `StyleMatcher.test.ts`

## Files Modified

- `packages/toned-core/StyleSheet/StyleSheet.test.ts` - New comprehensive test file
- `packages/toned-core/StyleMatcher/StyleMatcher.ts` - Added combined selector parsing
- `packages/toned-core/README.md` - Updated with full API documentation
