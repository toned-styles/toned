# TASK_7: Code Refactoring and Performance Optimization

## Summary

With all previous migration tasks complete, this task focuses on comprehensive code refactoring to achieve pristine code quality and extreme performance, particularly in the StyleSheet and StyleMatcher implementations.

## Primary Objectives

### 1. StyleMatcher Performance Optimization

**Current State**: `packages/toned-core/StyleMatcher/StyleMatcher.ts`
- Uses bitwise operations for variant matching (good)
- Has caching via Map (good)
- Uses `Object.fromEntries`, `Object.entries`, `forEach` extensively (could be optimized)

**Optimization Areas**:
- Replace `Object.entries()/forEach()` with `for...in` loops for hot paths
- Pre-allocate arrays where sizes are known
- Reduce object allocations in `match()` method
- Consider using typed arrays for bit operations if performance critical
- Profile and optimize `getPropsBits()` - called on every match
- Evaluate if WeakMap could help with memory management for cached results

**Algorithm Complexity**:
- Current `match()` is O(n) where n = number of compiled rules
- Consider pre-sorting rules by bit count for early exit
- Evaluate if a trie or other data structure could improve lookup time

### 2. StyleSheet Performance Optimization

**Current State**: `packages/toned-core/StyleSheet/StyleSheet.ts`
- Creates proxy objects for element access
- Uses `StyleMatcher` for variant resolution

**Optimization Areas**:
- Minimize proxy usage in hot paths
- Pre-compute static element mappings
- Lazy initialization of expensive operations
- Reduce closure allocations
- Consider code generation for frequently used stylesheets

### 3. Type System Cleanup

**Current State**: Types spread across multiple files with complex intersections

**Refactoring Areas**:
- Consolidate related types in `types.ts`
- Simplify generic constraints where possible
- Remove unused type helpers
- Add proper type documentation with examples
- Consider branded types for better type safety

**Files to Review**:
- `packages/toned-core/types.ts` - Main type definitions
- `packages/toned-core/definers.ts` - System definition types
- `packages/toned-core/StyleSheet/types.ts` (if exists)

### 4. Code Organization

**Current Structure Issues**:
- Some files are getting long
- Related functionality scattered

**Proposed Structure**:
```
packages/toned-core/
  types/
    index.ts         # Re-exports all types
    tokens.ts        # Token-related types
    stylesheet.ts    # Stylesheet types
    system.ts        # System/definer types
  StyleSheet/
    StyleSheet.ts    # Main implementation
    types.ts         # Internal types
  StyleMatcher/
    StyleMatcher.ts  # Main implementation
    types.ts         # Internal types
  utils/
    css.ts           # CSS utility functions
    dom.ts           # DOM-related utilities
```

### 5. API Simplification

**Consider**:
- Reducing number of symbols exported
- Simplifying `defineSystem` return type
- Making `t()` function more ergonomic
- Consolidating context/config patterns

**Breaking Changes Allowed**:
- Can rename/restructure exports
- Can simplify types even if less flexible
- Can remove deprecated patterns

### 6. Remove Technical Debt

**TODOs in Codebase**:
- `types.ts:65` - `//TODO` on `getProps` method
- `dom.ts:71` - `// TODO: support dynamic placeholders`
- `defineCssToken.ts:12` - `// TODO: consider moving to the core`

**Biome Ignore Comments to Resolve**:
- Many `noExplicitAny` ignores could potentially be typed properly
- Review each ignore comment for better alternatives

## Implementation Guidelines

### Performance Benchmarking

Before starting optimizations:
1. Create benchmark suite for StyleMatcher
2. Create benchmark suite for StyleSheet
3. Measure current baseline
4. Set target improvements (e.g., 2x faster variant matching)

### Code Quality Standards

- No `any` types without explicit justification in comments
- All public APIs documented with JSDoc
- Unit tests for all core functionality
- Integration tests for common patterns

### Backward Compatibility

**NOT a concern** - API can change freely. Focus on:
- Best possible developer experience
- Most intuitive type inference
- Cleanest internal implementation

## Success Criteria

- [ ] StyleMatcher performance improved (benchmark required)
- [ ] StyleSheet performance improved (benchmark required)
- [ ] All biome-ignore comments reviewed and minimized
- [ ] All TODO comments addressed or documented for future
- [ ] Types simplified and well-documented
- [ ] Code organized logically
- [ ] All existing tests pass
- [ ] New benchmarks added

## Notes

This task can be approached incrementally:
1. First: Performance profiling and benchmarking
2. Second: Critical path optimizations in StyleMatcher/StyleSheet
3. Third: Type system cleanup
4. Fourth: Code reorganization
5. Fifth: API simplification

Each step should maintain passing tests.
