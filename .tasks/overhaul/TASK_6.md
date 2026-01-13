# TASK_6: StyleSheet Performance Optimization

## Summary

Optimize the StyleSheet implementation for extreme performance in stylesheet creation and element access.

## Current Implementation Analysis

**Location**: `packages/toned-core/StyleSheet/StyleSheet.ts`

### Current Approach
- Creates proxy objects for element access
- Uses StyleMatcher for variant resolution
- Lazy initialization via `SYMBOL_INIT`

### Potential Bottlenecks

1. **Proxy overhead**
   - Proxies are slower than direct property access
   - Each element access goes through proxy handler

2. **Object creation in hot paths**
   - New objects created for each element access
   - Style merging creates new objects

3. **Variant chain processing**
   - `.variants()` creates new stylesheet wrapper
   - Chain may add overhead

4. **Media query handling**
   - `initMedia.ts` creates event listeners
   - State updates trigger re-computation

## Tasks

### 6.1 Create Benchmark Suite

- [ ] Create `StyleSheet.bench.ts`
- [ ] Benchmark stylesheet creation
- [ ] Benchmark element access (e.g., `styles.container`)
- [ ] Benchmark variant switching
- [ ] Benchmark with/without media queries
- [ ] Establish baseline metrics

### 6.2 Analyze Proxy Usage

- [ ] Profile proxy handler calls
- [ ] Identify hot paths through proxy
- [ ] Evaluate alternatives:
  - Pre-computed element objects
  - Getter-based access
  - Direct property assignment

### 6.3 Optimize Element Access

Current (proxy-based):
```typescript
const proxy = new Proxy(target, {
  get(target, prop) {
    // ... compute and return element props
  }
})
```

Consider:
```typescript
// Pre-compute elements at creation time
class Stylesheet {
  constructor(rules) {
    for (const element of elements) {
      this[element] = this.computeElement(element)
    }
  }
}
```

### 6.4 Optimize Variant Resolution

- [ ] Cache variant combinations
- [ ] Pre-compute common variant states
- [ ] Reduce object allocations in state changes

### 6.5 Optimize Stylesheet Creation

- [ ] Reduce closure allocations
- [ ] Lazy initialization only where beneficial
- [ ] Consider code generation for static stylesheets

### 6.6 Optimize Media Query Handling

- [ ] Batch media query updates
- [ ] Debounce state changes
- [ ] Minimize re-computation on media changes

### 6.7 Memory Optimization

- [ ] Identify memory leaks (if any)
- [ ] Reduce object allocations
- [ ] Consider object pooling
- [ ] Evaluate WeakRef for cached elements

### 6.8 Measure and Document

- [ ] Run benchmarks after each optimization
- [ ] Document performance improvements
- [ ] Compare with baseline

## Benchmark Template

```typescript
// StyleSheet.bench.ts
import { bench, describe } from 'vitest'
import { createStylesheet } from './StyleSheet'

const system = { /* test system */ }
const rules = { container: { ... }, label: { ... } }

describe('StyleSheet', () => {
  bench('creation', () => {
    createStylesheet(system, rules)
  })

  const sheet = createStylesheet(system, rules)

  bench('element access', () => {
    const _ = sheet.container
  })

  bench('element access with variants', () => {
    sheet.applyState({ size: 'sm', variant: 'primary' })
    const _ = sheet.container
  })
})
```

## Integration with StyleMatcher

The StyleSheet uses StyleMatcher internally. Ensure optimizations are compatible:
- StyleMatcher caching should be leveraged
- Avoid re-creating StyleMatcher instances
- Share compiled rules where possible

## Success Criteria

- [ ] Benchmark suite created
- [ ] Baseline metrics documented
- [ ] Measurable performance improvement (target: 2x faster)
- [ ] All tests pass
- [ ] No regression in functionality
- [ ] Memory usage stable or reduced
