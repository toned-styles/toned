# TASK_3: API Simplification

## Summary

Simplify the public API for better developer experience. Focus on ergonomics, discoverability, and type inference.

## Current API Pain Points

### 1. Multiple Symbols Exported

Currently exports many symbols that are internal implementation details:
- `SYMBOL_REF`
- `SYMBOL_INIT`
- `SYMBOL_VARIANTS`
- `SYMBOL_STYLE`
- `SYMBOL_ACCESS`

**Goal**: Hide internal symbols, expose only what's needed.

### 2. `defineSystem` Return Type Complexity

Returns object with `system`, `config`, `t`, `stylesheet`, `exec`:
```typescript
const { t, stylesheet } = defineSystem({ ... })
```

**Consider**: Is `exec` needed publicly? Can `system` and `config` be internal?

### 3. `t()` Function Ergonomics

Current usage:
```typescript
t({ bgColor: 'primary', padding: 2 })
```

**Consider**:
- Is the API intuitive?
- Can type inference be improved?
- Should there be shorthand helpers?

### 4. Stylesheet Creation Chain

Current:
```typescript
stylesheet({ ... }).variants({ ... })
```

**Consider**:
- Is `.variants()` chaining intuitive?
- Should variants be part of initial definition?
- How to handle `.extend()`?

## Tasks

### 3.1 Audit Public API

- [ ] List all public exports
- [ ] Categorize: essential vs. internal
- [ ] Identify what can be hidden

### 3.2 Hide Internal Symbols

- [ ] Move symbols to internal module
- [ ] Export only necessary symbols (if any)
- [ ] Update internal code to use internal imports

### 3.3 Simplify `defineSystem` Return

- [ ] Evaluate which properties need to be public
- [ ] Consider hiding `system`, `config`, `exec`
- [ ] Document the simplified API

### 3.4 Review `t()` Function

- [ ] Analyze common usage patterns
- [ ] Consider type improvements for better autocomplete
- [ ] Evaluate if helper functions would help

### 3.5 Review Stylesheet API

- [ ] Evaluate `.variants()` pattern
- [ ] Consider alternative APIs
- [ ] Ensure good TypeScript inference

### 3.6 Improve Type Inference

- [ ] Test autocomplete in various scenarios
- [ ] Fix any inference issues
- [ ] Add tests for type inference

### 3.7 Update Documentation

- [ ] Update JSDoc for all public APIs
- [ ] Add usage examples
- [ ] Document migration from old API (if changed)

## Current Exports to Review

```typescript
// From @toned/core
export { defineSystem, defineToken, defineUnit }
export { SYMBOL_REF, SYMBOL_INIT, SYMBOL_VARIANTS }
export { SYMBOL_STYLE, SYMBOL_ACCESS }
export type { TokenSystem, TokenConfig, TokenStyle, ... }

// From @toned/core/dom
export { inject, generate, getStyleNodeById }
```

## Success Criteria

- [ ] Minimal public API surface
- [ ] Internal symbols hidden
- [ ] Excellent TypeScript autocomplete
- [ ] Intuitive API for common operations
- [ ] All tests pass
- [ ] Examples updated to new API (if changed)
