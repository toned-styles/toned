# TASK_3: API Simplification - Outcome

## Status: COMPLETE

## Summary

Simplified the public API by hiding internal symbols and reducing the exported API surface.

## Changes Made

### 1. Hidden Internal Symbols

**Before**: All symbols were exported
```typescript
export {
  SYMBOL_INIT,
  SYMBOL_REF,
  SYMBOL_VARIANTS,
  SYMBOL_STYLE,
  SYMBOL_ACCESS,
  sym,
} from './types/index.ts'
```

**After**: Only SYMBOL_INIT exported (used by toned-react)
```typescript
export { SYMBOL_INIT } from './types/index.ts'
```

### 2. Symbol Usage Analysis

| Symbol | External Usage | Decision |
|--------|---------------|----------|
| SYMBOL_INIT | toned-react (useStyles) | **Keep public** |
| SYMBOL_REF | None | Hidden |
| SYMBOL_VARIANTS | None | Hidden |
| SYMBOL_STYLE | None | Hidden |
| SYMBOL_ACCESS | None | Hidden |
| sym | None | Hidden |

### 3. Updated Internal Imports

`stylesheet/StyleSheet.ts` now imports symbols from `utils/symbols.ts` directly:
```typescript
import { SYMBOL_INIT, SYMBOL_REF, SYMBOL_VARIANTS } from '../utils/symbols.ts'
```

## Current Public API

### Exports from `@toned/core`
```typescript
// Functions
export { defineConfig, defineSystem, defineToken, defineUnit, getConfig, setConfig }

// Symbols (minimal)
export { SYMBOL_INIT }

// Types
export type {
  Breakpoints, Config, ModType, Pseudo, Stylesheet, StylesheetInput,
  StylesheetType, TokenConfig, TokenStyle, TokenStyleDeclaration, Tokens, TokenSystem
}
```

### Exports from `@toned/core/dom`
```typescript
export { generate, inject, getStyleNodeById }
```

### Exports from `@toned/core/stylesheet`
```typescript
export { Base, createStylesheet, StyleMatcher, initMedia, unitlessNumbers }
```

## Future Improvements

The following could be hidden in a future breaking change:

1. **TokenSystem.exec** - Only used internally for style resolution
2. **TokenSystem.system** - Raw token definitions, rarely needed externally
3. **TokenSystem.config** - System configuration, rarely accessed directly

These are left public for now to maintain backward compatibility.

## Verification

- All tests pass (32 tests)
- Lint passes with no warnings
- Internal imports updated correctly
