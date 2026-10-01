# Benchmarks

Toned ships its benchmark runners with the source. This page summarises what
they measure and the most recent recorded figures. The numbers are
microbenchmarks from one development machine (macOS arm64, Bun 1.3.14), not
performance guarantees: repeat them on your own hardware before relying on them.

## What is measured

| Runner | Measures |
| --- | --- |
| `benchmarks/compare-matcher.mjs` | Compiling a stylesheet's rules and matching a variant state, on a small (16 facts, 17 rules) and a large (80 facts, 81 rules) fixture |
| `benchmarks/provider.mjs` | `TonedProvider` and `createElements` in React: mount, updates, variant and theme changes, and server rendering, for lists of 42 and 250 cells |
| `benchmarks/design-tools.ts` | The compiler and language-server operations (see the [design tools results](../../../../benchmarks/design-tools.md)) |

Every matcher result is checked against a plain reference evaluator for 512
states, so a faster result that is wrong is rejected.

## React runtime

Medians from the most recent recorded run.

| Measurement | 42 cells | 250 cells |
| --- | ---: | ---: |
| Mount | 2.9 ms | 11.5 ms |
| Provider update, children unchanged | 0.07 ms | 0.10 ms |
| Forced child rerender | 2.1 ms | 11.2 ms |
| Variant change | 2.3 ms | 11.7 ms |
| Theme change | 3.1 ms | 15.3 ms |
| Server render | 1.3 ms | 5.3 ms |

The work counts behind those timings are the more durable result:

- A provider update with unchanged children reads no host props and resolves no
  tokens.
- A forced child rerender reconciles its own hosts but resolves no tokens.
- Changing a variant resolves three token operations, not one per cell.
- A theme change resolves every cell, as it must.
- Interactions (hover, press) do not rerender React.

## Matcher

| Measurement | Small fixture | Large fixture |
| --- | ---: | ---: |
| Compile a stylesheet | 48 µs | 231 µs |
| Match, cache miss | 0.42 µs | 2.3 µs |
| Match, cache hit | — | 0.33 µs |

Compilation happens once per stylesheet and is shared; matches are served from a
bounded state cache.

## Limits of these numbers

- The React runs use happy-dom. They do not measure browser layout or paint.
- The native adapter in the runner is a JavaScript host, not a device or Fabric
  measurement.
- Figures come from a shared development machine, so small differences between
  runs are noise.
- Not every change is a speedup: in the most recent comparison the 250-cell
  mount was about 7% slower than the version before it.

## Reproduce

```sh
node benchmarks/compare-matcher.mjs
bun benchmarks/provider.mjs --current-only
```

The full measurement history, including comparisons between versions and the
method for each run, is in the
[benchmark log](../../../../benchmarks/README.md).
