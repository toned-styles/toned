# TASK_4 Outcome: Polish and API Improvement Suggestions

## Summary

Polished the implementation with improved type safety and documentation. Also providing suggestions for future API improvements.

## Polish Applied

### 1. Fixed Type Safety in Tests

Replaced `any` types with proper type annotations:

```typescript
// Before
const mockTokenSystem = { ... } as any

// After
const mockTokenSystem: TokenSystem<TokenStyleDeclaration> = { ... }
```

### 2. Added JSDoc Documentation

Added comprehensive JSDoc comments to public functions:

- `defineToken()` - With example of token definition
- `defineUnit()` - With example of unit resolver
- `defineSystem()` - With complete example and return value documentation

### 3. Code Cleanup

- Removed unused `beforeEach` import from tests
- Cleaned up comments

## API Improvement Suggestions

### 1. Stylesheet Composition with `.extend()`

Add a method to extend/compose stylesheets:

```typescript
const baseButton = stylesheet({
  container: { borderRadius: 'medium' },
  label: { fontWeight: 'medium' },
})

const primaryButton = baseButton.extend({
  container: { bgColor: 'primary' },
  label: { textColor: 'on_primary' },
}).variants<{ size: 'sm' | 'md' }>({
  '[size=sm]': { container: { paddingX: 2 } },
})
```

**Benefits:**
- Enables style composition and reuse
- Reduces duplication across similar components
- Maintains type safety through the chain

### 2. Responsive Variants

Add support for responsive variants that combine breakpoints with variants:

```typescript
stylesheet({
  container: { paddingX: 2 },
}).variants<{ size: 'sm' | 'md' }>({
  '[size=sm]': { container: { paddingX: 2 } },

  // Responsive variant: size=sm on md breakpoint
  '@md[size=sm]': { container: { paddingX: 3 } },
})
```

### 3. Variant Groups

Add support for grouping related variants:

```typescript
.variants<{
  appearance: 'filled' | 'outline' | 'ghost'
  color: 'primary' | 'danger' | 'neutral'
}>({
  // Current: requires all combinations explicitly
  '[appearance=filled][color=primary]': { ... },
  '[appearance=filled][color=danger]': { ... },

  // Suggested: variant groups
  appearance: {
    filled: { container: { borderWidth: 'none' } },
    outline: { container: { borderWidth: 'thin', bgColor: 'transparent' } },
  },
  color: {
    primary: { container: { bgColor: 'primary' } },
    danger: { container: { bgColor: 'danger' } },
  },
})
```

### 4. Default Variants

Add support for specifying default variant values:

```typescript
.variants<{ size: 'sm' | 'md'; variant: 'primary' | 'secondary' }>({
  defaults: { size: 'md', variant: 'primary' },

  '[size=sm]': { ... },
  '[variant=primary]': { ... },
})
```

**Benefits:**
- Clearer component API
- Type-safe default values
- Better DX when using components

### 5. Conditional Variants (Boolean Variants)

Add first-class support for boolean variants:

```typescript
.variants<{
  disabled: boolean
  loading: boolean
}>({
  '[disabled]': {
    container: { opacity: 0.5, pointerEvents: 'none' },
  },
  '[loading]': {
    label: { visibility: 'hidden' },
  },
})
```

### 6. Slot-based Element Typing

Add support for typed slots that enforce consistent element usage:

```typescript
const styles = stylesheet({
  // Type hint for element usage
  container: { $$type: 'view' as const, ... },
  label: { $$type: 'text' as const, ... },
  icon: { $$type: 'image' as const, ... },
})

// useStyles could then provide type hints for the right component
const s = useStyles(styles)
// s.container -> props for View
// s.label -> props for Text
// s.icon -> props for Image
```

### 7. Debug Mode

Add a debug mode for development:

```typescript
// In development config
setConfig({
  debug: true,
  // Logs matched rules, computed styles, variant changes
})
```

### 8. CSS Variable Output

Add option to output CSS variables for theming:

```typescript
const { stylesheet } = defineSystem(tokens, {
  outputMode: 'css-variables', // 'inline' | 'css-variables' | 'tailwind'
})

// Would generate: --toned-bg-color: var(--color-primary);
```

## Implementation Notes

The current implementation is solid and provides:
- Full type safety for the new API
- Efficient bitwise matching for variants
- Clean separation between API surface and internal format
- Good test coverage (27 tests)

The suggested improvements would enhance:
- Developer experience (composition, defaults, debug)
- Flexibility (responsive variants, boolean variants)
- Integration options (CSS variables, Tailwind)

## Files Modified

- `packages/toned-core/StyleSheet/StyleSheet.test.ts` - Fixed type annotations
- `packages/toned-core/definers.ts` - Added JSDoc documentation
