# TASK_4: Technical Debt Removal

## Summary

Address all TODOs, review biome-ignore comments, and clean up any remaining technical debt.

## TODOs in Codebase

### `types.ts:65`
```typescript
// TODO
getProps(this: any, elementKey: string): {}
```
**Action**: Properly type this method or document why `any` is necessary.

### `dom.ts:71`
```typescript
// TODO: support dynamic placeholders
```
**Context**: In `generate()` function, handling Number/String instances.
**Action**: Implement or document as future feature.

### `defineCssToken.ts:12`
```typescript
// TODO: consider moving to the core
```
**Action**: Evaluate if `defineCssToken` should be in toned-core.

## Biome-Ignore Comments to Review

Each ignore should be reviewed - can it be properly typed?

### `types.ts`
- Line 7: `Tokens = Record<string, any>` - Token values are truly dynamic
- Line 10: `TokenConfig<Values extends readonly any[]>` - Required for const generics
- Line 27-30: `TokenStyleDeclaration` - Dynamic token configs
- Line 33: `InlineStyle = any` - CSS properties
- Line 45: `Merge<D extends any[]>` - Tuple manipulation
- Line 66: `getProps(this: any, ...)` - Could be typed

### `definers.ts`
- Line 79, 81: Generic constraints - Review necessity
- Line 118, 122: Cast to any - Review if avoidable

### `StyleMatcher.ts`
- Line 6, 24, 49, 62: Dynamic rule structures - Review typing
- Line 512, 539: Cache and isEqual - Could use `unknown`

### `StyleSheet.ts`
- Various any types for dynamic stylesheet handling

### `initMedia.ts`
- Line 34: `Emitter<T extends Record<string, any>>` - Generic emitter

### `dom.ts`
- Line 68, 96, 101: Token handling - Review typing

### `toned-react/index.ts`
- Line 11, 14: ElementProps - Intentionally loose for flexibility

### `toned-systems/`
- Various placeholder declarations and generic types

## Tasks

### 4.1 Resolve TODOs

- [ ] `types.ts:65` - Properly type `getProps` or document
- [ ] `dom.ts:71` - Implement dynamic placeholders or create issue
- [ ] `defineCssToken.ts:12` - Decide on location, move if appropriate

### 4.2 Review Each Biome-Ignore

For each ignore comment:
1. Can it be properly typed?
2. If not, is the explanation sufficient?
3. Update explanation to be more specific

- [ ] Review `types.ts` ignores
- [ ] Review `definers.ts` ignores
- [ ] Review `StyleMatcher.ts` ignores
- [ ] Review `StyleSheet.ts` ignores
- [ ] Review `initMedia.ts` ignores
- [ ] Review `dom.ts` ignores
- [ ] Review `toned-react` ignores
- [ ] Review `toned-systems` ignores

### 4.3 Type Improvements

Where `any` can be replaced:
- [ ] Use `unknown` with type guards
- [ ] Use more specific union types
- [ ] Use generic constraints

### 4.4 Code Cleanup

- [ ] Remove dead code
- [ ] Remove unused imports
- [ ] Fix any remaining lint warnings
- [ ] Ensure consistent code style

### 4.5 Test Coverage

- [ ] Add tests for any newly typed code
- [ ] Ensure edge cases are covered
- [ ] Add type tests if applicable

## Success Criteria

- [ ] All TODOs resolved or documented as issues
- [ ] Each biome-ignore has clear justification
- [ ] Reduced `any` usage where possible
- [ ] All tests pass
- [ ] Clean lint output
