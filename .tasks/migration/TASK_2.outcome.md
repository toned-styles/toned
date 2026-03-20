# TASK_2 Outcome: API Migration

## Summary

Successfully migrated the library to the new interface with:
- Flat pseudo classes inside elements (`:hover`, `@sm` for self-styling only)
- Flat cross-element selectors (`'container:hover'` with nested element names)
- Separate `.variants<T>({...})` chain method instead of `...stylesheet.state<T>`
- No `$element` references needed in the new API - use direct element names

## Changes Made

### 1. Types (`packages/toned-core/types.ts`)

Added new types for the new API:

```typescript
// Element style with inline pseudo/breakpoints (self only)
type ElementStyleNew<S, AvailablePseudo, AvailableBreakpoints> = TokenStyle<S> & {
  $$type?: 'view' | 'text' | 'image'
} & {
  [P in AvailablePseudo]?: TokenStyle<S>  // :hover, :active, :focus
} & {
  [B in AvailableBreakpoints as `@${B}`]?: TokenStyle<S>  // @sm, @md, etc
}

// Element map for variants
type ElementMap<S, Elements> = {
  [E in Elements]?: TokenStyle<S>
}

// Cross-element selector type
type CrossElementSelector<Elements> =
  | `${Elements}:active`
  | `${Elements}:hover`
  | `${Elements}:focus`
  | ... // combinations in alphabetical order

// Main stylesheet input
type StylesheetInput<S, T, Elements> = {
  [K in Elements]?: ElementStyleNew<S>
} & {
  [K in CrossElementSelector<Elements>]?: ElementMap<S, Elements>
}

// Variants input
type VariantsInput<S, Elements, Mods> = {
  [K in VariantSelector<Mods>]?: ElementMap<S, Elements>
} & {
  [key: `[${string}]`]: ElementMap<S, Elements> | undefined  // combined selectors
}

// Pre-variants stylesheet (has .variants() method)
type PreVariantsStylesheet<S, T, Elements> = Stylesheet<S, T, never> & {
  variants<Mods>(variants: VariantsInput<S, Elements, Mods>): Stylesheet<S, T, Mods>
}
```

### 2. StyleSheet (`packages/toned-core/StyleSheet/StyleSheet.ts`)

Added transformation function to convert new API format to internal format:

```typescript
function transformRulesToInternal(baseRules, variantRules?) {
  // 1. Collect all element names
  // 2. Process element definitions (inline pseudo -> $self format)
  // 3. Process cross-element selectors (container:hover -> nested structure)
  // 4. Process variants (element names -> $element references)
}
```

Added `.variants()` method to stylesheet:

```typescript
const stylesheet = {
  [SYMBOL_REF]: ref,
  [SYMBOL_INIT]: (config, modsState) => { ... },
  variants: (newVariantRules) => createStylesheet(ref, rules, newVariantRules),
}
```

### 3. Definers (`packages/toned-core/definers.ts`)

Updated to use new types:

```typescript
stylesheet: (<T extends StylesheetInput<S & C, T>>(rules: T) => {
  return createStylesheet(ref, rules)
}) as StylesheetType<S & C>
```

### 4. Examples Updated

Updated `examples/shared/button.ts` and `examples/shared/card.ts` to use new API.

**Old API:**
```typescript
stylesheet({
  ...stylesheet.state<{ variant: 'accent' | 'secondary' }>,
  container: {
    ':hover': {
      $container: { bgColor: 'red' },
      $label: { color: 'white' }
    }
  },
  '[variant=accent]': {
    $container: { bgColor: 'blue' }
  }
})
```

**New API:**
```typescript
stylesheet({
  container: {
    ':hover': { bgColor: 'red' },  // self only
  },
  'container:hover': {             // cross-element
    container: { bgColor: 'red' },
    label: { color: 'white' }
  }
}).variants<{ variant: 'accent' | 'secondary' }>({
  '[variant=accent]': {
    container: { bgColor: 'blue' }
  }
})
```

### 5. Tests

- Updated test file to use `vitest` instead of `bun:test`
- Added new tests for the `.variants()` chain
- Added tests for transformation functions
- All 9 tests passing

## Key Decisions

1. **Backward Compatibility**: The internal format (with `$element` references) is preserved. The new API is transformed to this internal format at stylesheet creation time.

2. **Type Safety**: Full type inference is maintained for:
   - Element names
   - Token properties
   - Pseudo classes (`:hover`, `:active`, `:focus`)
   - Breakpoints (`@sm`, `@md`, etc.)
   - Variant selectors

3. **Cross-Element Pseudo Order**: Multiple pseudo classes must be in alphabetical order (e.g., `container:active:hover` not `container:hover:active`). This is enforced by the type system.

4. **Variants Chaining**: `.variants()` returns a new stylesheet with the combined rules, allowing for composition.

## Files Modified

- `packages/toned-core/types.ts` - New type definitions
- `packages/toned-core/definers.ts` - Updated stylesheet type
- `packages/toned-core/StyleSheet/StyleSheet.ts` - Transformation + variants method
- `packages/toned-core/StyleMatcher/StyleMatcher.test.ts` - Updated to vitest + new tests
- `examples/shared/button.ts` - Migrated to new API
- `examples/shared/card.ts` - Migrated to new API
