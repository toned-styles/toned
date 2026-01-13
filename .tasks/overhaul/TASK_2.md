# TASK_2: Code Organization

## Summary

Reorganize code structure for better readability, maintainability, and logical grouping.

## Current Structure

```
packages/toned-core/
  config.ts
  definers.ts
  dom.ts
  index.ts
  types.ts
  utils.ts
  StyleMatcher/
    StyleMatcher.ts
    StyleMatcher.test.ts
  StyleSheet/
    StyleSheet.ts
    StyleSheet.test.ts
    initMedia.ts
```

## Proposed Structure

```
packages/toned-core/
  index.ts              # Public exports

  types/
    index.ts            # Re-exports all types
    tokens.ts           # Token-related types
    stylesheet.ts       # Stylesheet types
    system.ts           # System/definer types
    internal.ts         # Internal types (not exported)

  system/
    index.ts            # defineSystem, defineToken, defineUnit
    config.ts           # Global config management

  stylesheet/
    index.ts            # createStylesheet, Stylesheet class
    StyleMatcher.ts     # Variant matching logic
    StyleMatcher.test.ts
    StyleSheet.ts       # Main stylesheet implementation
    StyleSheet.test.ts
    media.ts            # Media query handling (renamed from initMedia)

  dom/
    index.ts            # DOM utilities
    inject.ts           # Style injection
    generate.ts         # CSS generation

  utils/
    index.ts
    css.ts              # CSS-specific utilities (camelToKebab, etc.)
    symbols.ts          # Symbol definitions
```

## Tasks

### 2.1 Create Directory Structure

- [ ] Create new directories
- [ ] Plan file migrations

### 2.2 Migrate Types

- [ ] Move types to `types/` directory
- [ ] Update imports across codebase
- [ ] Maintain backward-compatible re-exports from old locations (temporary)

### 2.3 Reorganize System Code

- [ ] Move `definers.ts` → `system/index.ts`
- [ ] Move `config.ts` → `system/config.ts`
- [ ] Update imports

### 2.4 Reorganize Stylesheet Code

- [ ] Rename `initMedia.ts` → `stylesheet/media.ts`
- [ ] Consolidate stylesheet-related code
- [ ] Update imports

### 2.5 Reorganize DOM Code

- [ ] Split `dom.ts` into focused modules
- [ ] `inject.ts` - Style injection
- [ ] `generate.ts` - CSS generation

### 2.6 Update Package Exports

- [ ] Update `index.ts` with new paths
- [ ] Update `package.json` exports if needed
- [ ] Ensure all public APIs remain accessible

### 2.7 Clean Up

- [ ] Remove old files after migration
- [ ] Remove temporary re-exports
- [ ] Update any documentation references

## Files to Create/Modify

- Create new directory structure
- Migrate existing files
- Update all import statements
- Update `package.json` exports

## Success Criteria

- [ ] Code logically organized by feature
- [ ] Clear separation of concerns
- [ ] All imports updated
- [ ] All tests pass
- [ ] Examples still work
- [ ] No circular dependencies
