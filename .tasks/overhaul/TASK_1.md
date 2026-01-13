# TASK_1: Type System Cleanup

## Summary

Consolidate, simplify, and properly document the type system. Remove unnecessary `any` types where possible and add proper type documentation.

## Current State

Types are spread across multiple files with complex intersections:
- `packages/toned-core/types.ts` - Main type definitions
- `packages/toned-core/definers.ts` - System definition types
- `packages/toned-core/StyleSheet/StyleSheet.ts` - Inline types
- `packages/toned-core/StyleMatcher/StyleMatcher.ts` - Inline types

## Tasks

### 1.1 Audit Existing Types

- [ ] List all exported types and their purposes
- [ ] Identify duplicate or redundant types
- [ ] Map type dependencies

### 1.2 Consolidate Types

- [ ] Move related types together
- [ ] Create logical groupings (tokens, stylesheet, system, etc.)
- [ ] Consider separate files for major type categories:
  ```
  types/
    index.ts       # Re-exports
    tokens.ts      # TokenConfig, TokenStyle, Tokens, etc.
    stylesheet.ts  # Stylesheet-related types
    system.ts      # TokenSystem, defineSystem types
  ```

### 1.3 Reduce `any` Usage

Review each `biome-ignore lint/suspicious/noExplicitAny` comment:

**In `types.ts`:**
- `Tokens = Record<string, any>` - Can this be `Record<string, unknown>`?
- `TokenConfig<Values extends readonly any[]>` - Necessary for const generics
- `TokenStyleDeclaration` index signature - Required for dynamic tokens
- `getProps(this: any, ...)` - Can be properly typed

**In `definers.ts`:**
- Generic constraints on `defineSystem` - Review necessity

**In `StyleMatcher.ts`:**
- Cache types - Could use `unknown` with type guards
- Rule types - Could be more specific

### 1.4 Add JSDoc Documentation

- [ ] Document all public types with examples
- [ ] Add `@example` blocks showing usage
- [ ] Document type parameters

### 1.5 Simplify Generic Constraints

- [ ] Review complex type intersections
- [ ] Simplify where possible without losing type safety
- [ ] Consider branded types for better inference

## Files to Modify

- `packages/toned-core/types.ts`
- `packages/toned-core/definers.ts`
- `packages/toned-core/StyleSheet/StyleSheet.ts`
- `packages/toned-core/StyleMatcher/StyleMatcher.ts`

## Success Criteria

- [ ] Types logically organized
- [ ] Reduced `any` usage (document remaining necessities)
- [ ] All public types have JSDoc with examples
- [ ] All tests pass
- [ ] TypeScript inference still works correctly in examples
