# Benchmarks

Toned ships its benchmark runners with the source. This page summarises what
they measure and the current recorded figures. They are microbenchmarks from one
machine (Apple M1 Pro, Bun 1.4.2, recorded under load), not performance
guarantees: repeat them on your own hardware before relying on them.

## What is measured

| Runner                           | Measures                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `benchmarks/compare-matcher.mjs` | Compiling a stylesheet's rules and matching a variant state, with 16 facts/17 rules and 80 facts/81 rules                |
| `benchmarks/completion.mjs`      | Controllers, host writes and `useStyles` in React for a 42-cell workload, SSR/CSS size and typechecking                  |
| `benchmarks/provider.mjs`        | `TonedProvider` and `createElements` in React for lists of 42 and 250 cells                                              |
| `benchmarks/design-tools.ts`     | Compiler indexing, incremental updates and token completion (see [design tools](../../../../benchmarks/design-tools.md)) |

Each runner asserts the behaviour it measures. Every matcher result is checked
against a plain reference evaluator for 512 states, so a faster result that is
wrong fails the run.

## React runtime

Medians of five runs with the explicit provider.

| Measurement                         | 42 cells | 250 cells |
| ----------------------------------- | -------: | --------: |
| Mount                               |   5.5 ms |   18.2 ms |
| Provider update, children unchanged |  0.15 ms |   0.13 ms |
| Forced child rerender               |   3.4 ms |   13.5 ms |
| Variant change                      |   3.3 ms |   14.1 ms |
| Theme change                        |   4.8 ms |   20.3 ms |
| Server render                       |   1.7 ms |    6.4 ms |

The work counts behind those timings are exact and more durable:

- A provider update with unchanged children reads no host props and resolves no
  tokens.
- A forced child rerender reconciles its own hosts but resolves no tokens.
- Changing a variant resolves three token operations, not one per cell.
- A theme change resolves every cell, as it must.
- Hover does not rerender React.
- Moving the selection across 42 cells with distinct style overrides derives
  only the two changed override entries.
- A state transition writes once per host; repeating the same state writes
  nothing.

## Matcher

| Measurement          | 16 facts | 80 facts |
| -------------------- | -------: | -------: |
| Compile a stylesheet |    59 µs |   329 µs |
| Match, cache miss    |  0.83 µs |   3.1 µs |
| Match, cache hit     |  0.09 µs |  0.49 µs |

Compilation happens once per stylesheet and is shared; matches are served from a
bounded state cache.

## Limits of these numbers

- The React runs use happy-dom and React's development build. They do not
  measure browser layout or paint.
- The native adapter in the runner is a JavaScript host, not a device or Fabric
  measurement.
- The recorded run shared the machine with other builds, so absolute timings are
  inflated and small differences between runs are noise.

## Reproduce

```sh
node benchmarks/compare-matcher.mjs
node benchmarks/completion.mjs
node benchmarks/provider.mjs --pairs=5
bun benchmarks/design-tools.ts 1000 3
```

Pass a Git revision (`node benchmarks/provider.mjs <revision>`) to
measure that revision beside the current sources. The method for each runner
and the full results are in the
[benchmarks README](../../../../benchmarks/README.md).
