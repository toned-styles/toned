# TASK_2: Code Organization - Outcome

## Status: COMPLETE

## Summary

Reorganized the `toned-core` package into a modular directory structure with clear separation of concerns.

## New Structure

```
packages/toned-core/
  index.ts              # Main public exports
  package.json          # Added exports field

  types/
    index.ts            # Re-exports all types
    tokens.ts           # Token-related types
    config.ts           # Config type
    stylesheet.ts       # Stylesheet types
    system.ts           # TokenSystem type

  system/
    index.ts            # Module exports
    config.ts           # Global config management
    definers.ts         # defineSystem, defineToken, defineUnit

  stylesheet/
    index.ts            # Module exports
    StyleSheet.ts       # Main stylesheet implementation
    StyleSheet.test.ts  # Tests
    StyleMatcher.ts     # Variant matching logic
    StyleMatcher.test.ts # Tests
    media.ts            # Media query handling (renamed from initMedia)
    unitlessNumbers.ts  # CSS unitless properties

  dom/
    index.ts            # Module exports
    inject.ts           # Style injection
    generate.ts         # CSS generation

  utils/
    index.ts            # Module exports
    css.ts              # CSS utilities (camelToKebab)
    symbols.ts          # Symbol definitions
```

## Changes Made

### 1. Created Modular Directory Structure
- `types/` - All type definitions split by domain
- `system/` - System definition and configuration
- `stylesheet/` - Stylesheet and matching logic
- `dom/` - DOM utilities for style injection
- `utils/` - Shared utilities and symbols

### 2. Added Package Exports
Updated `package.json` with subpath exports:
```json
"exports": {
  ".": "./index.ts",
  "./dom": "./dom/index.ts",
  "./types": "./types/index.ts",
  "./stylesheet": "./stylesheet/index.ts",
  "./system": "./system/index.ts",
  "./utils": "./utils/index.ts"
}
```

### 3. Updated All Imports
- Updated imports in `toned-core` to use new paths
- Updated imports in `toned-react` to use main exports
- Updated imports in `toned-systems` to use main exports
- Updated imports in `toned/scripts` to use main exports

### 4. Renamed Files
- `initMedia.ts` → `media.ts` (clearer naming)
- Consolidated `StyleSheet/` and `StyleMatcher/` into single `stylesheet/` directory

### 5. Removed Old Files
- Deleted: `config.ts`, `definers.ts`, `dom.ts`, `types.ts`, `utils.ts` (root level)
- Cleaned up: `.dist/` directory

## Import Patterns

### Before
```typescript
import { getConfig } from '@toned/core/config.js'
import { SYMBOL_INIT } from '@toned/core/types.js'
import type { Base } from '@toned/core/StyleSheet/StyleSheet.ts'
```

### After
```typescript
import { getConfig, SYMBOL_INIT } from '@toned/core'
import type { Base } from '@toned/core/stylesheet'
```

## Verification

- All tests pass (32 tests)
- Lint passes with no warnings
- All imports updated across packages

## Notes

- Case-insensitive filesystem caused some challenges during migration (had to use temp directory for renaming)
- Biome auto-organized imports after migration
