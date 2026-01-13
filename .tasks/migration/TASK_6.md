# TASK_6: Fix Remaining Issues from TASK_5

## Summary

TASK_5 was not fully completed. This task addresses the remaining issues to ensure the project builds and passes all checks.

## Issues to Fix

### 1. Module Path Errors in Examples

Examples import non-existent paths:
- `@toned/react/new/react-web` → should be `@toned/react/react-web`
- `@toned/react/new/react-native` → should be `@toned/react/react-native`
- `@toned/react/new/ctx.native` → should be `@toned/react/ctx.native`

Files affected:
- `examples/email/toned.config.ts`
- `examples/email/App.tsx`
- `examples/expo-app/toned.config.ts`
- `examples/pdf/toned.config.ts`

### 2. Type Incompatibility with Breakpoints

The `TokenStyleDeclaration` type requires all properties to be `TokenConfig<any, any>`, but `breakpoints` is of type `Breakpoints<T>` which doesn't have `values` and `resolve` properties.

Solution: Exclude `breakpoints` from the index signature check or handle it separately in the type definition.

### 3. UseStyles Return Type

The `useStyles` function returns `Record<never, never>` which causes property access errors. Need to fix the return type to properly expose element properties.

### 4. Lint Warnings

Fix remaining lint issues:
- `noExplicitAny` in `StyleMatcher.ts:539` (isEqual function)
- `noExplicitAny` in `initMedia.ts:34` (Emitter class)
- `noExplicitAny` in `definers.ts:81, 122`
- `noAccumulatingSpread` in `definers.ts:89`
- Unused suppression comment at `definers.ts:83`

### 5. Import Extension Errors

The `examples/expo-app/index.ts` imports with `.tsx` extension which is not allowed without `allowImportingTsExtensions`.

## Success Criteria

- [ ] `pnpm ci:typecheck` passes with no errors
- [ ] `pnpm ci:lint` passes with no errors/warnings
- [ ] `pnpm test` passes
- [ ] Example apps can be type-checked correctly
