# TASK_5: StyleMatcher Performance Optimization

## Summary

Optimize the StyleMatcher implementation for extreme performance in variant matching.

## Current Implementation Analysis

**Location**: `packages/toned-core/StyleMatcher/StyleMatcher.ts`

### Current Approach
- Uses bitwise operations for variant matching (efficient)
- Caches results via Map (good)
- Compiles rules into bit masks at construction time

### Potential Bottlenecks

1. **Object operations in hot paths**
   - `Object.entries()`, `Object.fromEntries()`, `forEach()` create overhead
   - Could use `for...in` loops instead

2. **`getPropsBits()` - called every match**
   ```typescript
   getPropsBits(props: Partial<Schema>) {
     let bits = 0
     this.bits.forEach((x) => { ... })
     return bits
   }
   ```
   - Uses `forEach` instead of for loop
   - Could be optimized

3. **`match()` - main hot path**
   - Iterates all compiled rules
   - Creates new result object each time (when not cached)

4. **Memory allocations**
   - New objects created in match results
   - Could potentially reuse objects

## Tasks

### 5.1 Create Benchmark Suite

- [ ] Create `StyleMatcher.bench.ts`
- [ ] Benchmark `match()` with various prop combinations
- [ ] Benchmark `getPropsBits()`
- [ ] Benchmark construction time
- [ ] Establish baseline metrics

### 5.2 Optimize `getPropsBits()`

Current:
```typescript
this.bits.forEach((x) => {
  const prop = x[0]
  const value = props[prop]
  if (!value || x[1][value] === undefined) return
  bits |= x[1][value]
})
```

Optimized:
```typescript
for (let i = 0; i < this.bits.length; i++) {
  const [prop, values] = this.bits[i]
  const value = props[prop]
  if (value !== undefined && values[value] !== undefined) {
    bits |= values[value]
  }
}
```

### 5.3 Optimize `match()`

- [ ] Replace `Object.entries()` with `for...in`
- [ ] Pre-allocate result object structure
- [ ] Consider object pooling for uncached results

### 5.4 Optimize `flattenRules()`

- [ ] Replace `forEach` with for loops
- [ ] Reduce Map/Set operations
- [ ] Pre-allocate where sizes are known

### 5.5 Optimize `compile()`

- [ ] Review bit allocation strategy
- [ ] Consider rule ordering for early exit
- [ ] Optimize mask calculation

### 5.6 Consider Alternative Data Structures

- [ ] Evaluate trie for selector lookup
- [ ] Consider typed arrays for bit operations
- [ ] Evaluate WeakMap for memory management

### 5.7 Measure and Document

- [ ] Run benchmarks after each optimization
- [ ] Document performance improvements
- [ ] Add benchmark to CI (optional)

## Benchmark Template

```typescript
// StyleMatcher.bench.ts
import { bench, describe } from 'vitest'
import { StyleMatcher } from './StyleMatcher'

const rules = { /* test rules */ }
const matcher = new StyleMatcher(rules)

describe('StyleMatcher', () => {
  bench('match() - simple props', () => {
    matcher.match({ size: 'sm', variant: 'primary' })
  })

  bench('match() - complex props', () => {
    matcher.match({ size: 'sm', variant: 'primary', disabled: true, ... })
  })

  bench('getPropsBits()', () => {
    matcher.getPropsBits({ size: 'sm', variant: 'primary' })
  })
})
```

## Success Criteria

- [ ] Benchmark suite created
- [ ] Baseline metrics documented
- [ ] Measurable performance improvement (target: 2x faster)
- [ ] All tests pass
- [ ] No regression in functionality
