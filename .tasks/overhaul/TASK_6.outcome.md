# TASK_6: StyleSheet Performance Optimization - Outcome

## Status: COMPLETE

## Summary

Created StyleSheet benchmark suite and applied targeted optimizations to hot paths.

## Performance Results

### Benchmark Metrics

| Metric | Ops/sec | Notes |
|--------|---------|-------|
| matchStyles | 11.8M | Very fast (cached) |
| applyState | 4.8-5.4M | Fast state updates |
| getCurrentStyle | 3.4M | Token resolution |
| element access | 3.1-3.3M | Getter-based |
| createStylesheet | 304k | One-time cost |
| extend() | 226k | Creates new stylesheet |
| variants() | 156k | Chain method |
| SYMBOL_INIT | 98k | Base creation (bottleneck) |

### Key Observations

1. **matchStyles is extremely fast (11.8M ops/sec)** due to StyleMatcher caching
2. **SYMBOL_INIT (Base creation)** is the main bottleneck at 98k ops/sec - this creates a new StyleMatcher instance
3. **Element access** (3.1M ops/sec) is fast thanks to Object.defineProperty getters (not Proxy)

## Changes Made

### 1. `createStylesheet()` - Inline Filter

**Before:**
```typescript
const elementKeys = Object.keys(rules as object).filter(
  (k) =>
    !k.startsWith('[') &&
    !k.includes(':') &&
    k !== 'prototype' &&
    k !== SYMBOL_VARIANTS.toString(),
)

for (const elementKey of elementKeys) {
```

**After:**
```typescript
const variantSymbolStr = SYMBOL_VARIANTS.toString()
for (const elementKey in rules as object) {
  if (
    elementKey[0] === '[' ||
    elementKey.includes(':') ||
    elementKey === 'prototype' ||
    elementKey === variantSymbolStr
  )
    continue
```

Eliminates intermediate array allocation from `Object.keys().filter()`.

### 2. `applyElementStyles()` - forEach → for...of

**Before:**
```typescript
this.matcher.elementSet.forEach((elementKey) => {
  if (this.matcher.isEqual(...)) return
  setStyles(...)
})
```

**After:**
```typescript
for (const elementKey of this.matcher.elementSet) {
  if (this.matcher.isEqual(...)) continue
  setStyles(...)
}
```

Eliminates callback overhead.

## Benchmark Suite Created

Added `StyleSheet.bench.ts` with comprehensive benchmarks:
- createStylesheet construction
- SYMBOL_INIT (Base creation)
- Element access (container, label)
- getCurrentStyle
- matchStyles
- applyState with various changes
- variants() chain
- extend() method

## Verification

- All 32 tests pass
- Lint passes with no warnings

## Architectural Notes

### Why Base Creation is the Bottleneck

The `SYMBOL_INIT` function creates a new `Base` instance which:
1. Creates a new `StyleMatcher` (optimized in TASK_5)
2. Initializes media query listeners
3. Matches initial styles

This is intentional - full initialization happens once per stylesheet instantiation.

### Why Element Access is Fast

The implementation uses `Object.defineProperty` with getters on the prototype, not Proxy:

```typescript
Object.defineProperty(LocalBase.prototype, elementKey, {
  get(this: LocalBase) {
    return this.config.getProps.call(this, elementKey)
  },
})
```

This avoids Proxy overhead while still providing dynamic property access.

### StyleMatcher Caching Benefits

The `match()` function caches results by `propsBits`:
- First call: computes and caches
- Subsequent calls with same props: O(1) cache hit
- This is why `matchStyles` is so fast (11.8M ops/sec)

## Future Optimization Opportunities

1. **StyleMatcher reuse**: Consider caching/pooling StyleMatcher instances for identical rules
2. **Lazy media initialization**: Defer media query setup until first access
3. **Pre-computed common variants**: Cache common variant combinations at creation time
