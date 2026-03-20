# TASK_1 Outcome: Codebase Understanding

## Project Structure

The project is a monorepo with the following key packages:

- `packages/toned-core` - Core library with the main logic
- `packages/toned-react` - React bindings
- `packages/toned-systems` - Design system definitions (base tokens)
- `packages/toned-themes` - Theme configurations (e.g., shadcn)
- `packages/toned` - Main entry point
- `examples/` - Various example apps (vite, expo, email, pdf)

## Core Architecture

### 1. Token System (`defineSystem`)

Creates a token system that provides:
- `system` - The token definitions
- `t` - Inline token function for one-off styles
- `stylesheet` - Function to create stylesheets
- `exec` - Resolves tokens to actual CSS styles

Location: `packages/toned-core/definers.ts`

### 2. Stylesheet Creation

Current API pattern:
```ts
stylesheet({
  ...stylesheet.state<{
    size: 'm' | 's'
    variant: 'accent' | 'danger'
  }>,

  container: {
    /* base tokens */
    ':hover': {
      $container: { /* hover styles for container */ },
      $label: { /* hover styles for label */ },
    },
  },

  label: { /* base tokens */ },

  '[variant=accent]': {
    $container: {
      bgColor: 'action',
      ':hover': {
        $container: { bgColor: 'action_secondary' },
        $label: { textColor: 'on_action_secondary' },
      },
    },
    $label: { textColor: 'on_action' },
  },
})
```

Key characteristics:
- State types defined via `...stylesheet.state<{...}>` spread
- Variants use `[key=value]` selector syntax
- Element references use `$element` prefix
- Pseudo states and breakpoints are nested inside elements
- Cross-element pseudo effects use nested `$element` references

### 3. StyleMatcher (Bitwise Matching Engine)

Location: `packages/toned-core/StyleMatcher/StyleMatcher.ts`

The StyleMatcher is the runtime matching engine that:
1. **Flattens nested rules** - Converts the nested structure into a flat representation
2. **Compiles rules into bitmasks** - Each variant/state value gets a unique bit position
3. **Efficient matching** - Uses bitwise AND operations for O(1) state matching
4. **Caching** - Results are cached by state bits

How it works:
```
propertyBits = { size: { m: 1, s: 2 }, variant: { accent: 4, danger: 8 } }
state = { size: 'm', variant: 'accent' }
stateBits = 1 | 4 = 5

For each rule: if (stateBits & rule.mask) === rule.value → apply rule
```

### 4. Type System

Location: `packages/toned-core/types.ts`

Key types:
- `TokenConfig<Values, Result>` - Token definition
- `TokenSystem<S, Config>` - Full system type
- `StylesheetValue<S, Mods, T>` - Stylesheet input type
- `Stylesheet<S, T, M>` - Compiled stylesheet type
- `ElementStyle<S, Elements, Mods, Pseudo, Breakpoints>` - Element style with all modifiers

The type system uses:
- Mapped types for element keys
- Template literal types for selectors like `[key=value]`
- Recursive conditional types for nested structures
- `NoInfer<T>` for better type inference

### 5. Usage Pattern

```tsx
// Define styles
export const styles = stylesheet({ ... })

// Use in component
function Button() {
  const s = useStyles(styles, { variant: 'accent', size: 'm' })

  return (
    <button {...s.container}>
      <span {...s.label}>Click me</span>
    </button>
  )
}
```

Styles are spread with `{...s.element}` which allows the adapter (web/native/etc.) to return appropriate props (style, className, event handlers for interactions).

### 6. Config System

Location: `packages/toned-core/config.ts`

The config system manages:
- Token resolution
- Platform-specific behavior (className vs inline styles)
- Media query handling
- Interaction handling

## Key Insights for Migration

1. **Variant Handling** - Currently deeply nested, needs to become flat
2. **Element References** - `$element` pattern should be replaced with direct element names
3. **Pseudo Classes** - Should be flat at element level for single-element effects
4. **Cross-Element Effects** - Should use flat selectors like `'container:hover'`
5. **Variants Method** - Should become a chainable `.variants<T>({...})` method
6. **Type Safety** - Must maintain full type inference for all selectors and tokens

## Files to Modify for TASK_2

1. `packages/toned-core/types.ts` - Update type definitions
2. `packages/toned-core/definers.ts` - Update `stylesheet` to support chaining
3. `packages/toned-core/StyleSheet/StyleSheet.ts` - Update stylesheet creation
4. `packages/toned-core/StyleMatcher/StyleMatcher.ts` - Update rule flattening
5. Example files - Update to new API
