# Benchmarks

These runners measure the style engine, the React bindings and the design
tooling against deterministic synthetic fixtures. Each one also asserts the
behaviour it measures (correct matches, write counts, resolver calls, no
reparsing), so a run that gets faster by doing the wrong thing fails.

They are microbenchmarks, not performance gates. No wall-clock threshold is
enforced anywhere; only the structural assertions can fail a run.

## Requirements

Run from the repository root after `pnpm install`. The runners use Node 26 and
Bun 1.4; workers run in Bun with `NODE_ENV=test`, so React uses its development
build (required for `act`). Nothing writes to the working tree: temporary files
go to the OS temporary directory, and results are printed as JSON on stdout.

## Runners

| Command                                                                              | Measures                                                                      |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `node benchmarks/compare-matcher.mjs [revision]`                                     | Rule compilation and variant-state matching in `StyleMatcher`                 |
| `node benchmarks/completion.mjs [revision] [--raw-style \| --platform-style]`        | Controllers, host writes, `useStyles` in React, SSR/CSS sizes, typechecking   |
| `node benchmarks/provider.mjs [revision] [--pairs=N]`                                | `TonedProvider` and `createElements` in React, explicit `t`, a native host    |
| `bun benchmarks/design-tools.ts [files] [coldSamples]`                               | Compiler indexing, incremental updates, queries and token completion          |
| `node --experimental-strip-types benchmarks/design-tools-shared.ts [files]`          | Invalidation when many consumers share one design system                      |
| `node benchmarks/state-recalc.mjs [revision] [--rows=…] [--states=…] [--contexts=…]` | Chromium style recalculation per declared state (and context), by list length |
| `node benchmarks/cascade-browser.mjs`                                                | A check, not a timing: Chromium computes the shorthand splits correctly       |

The three `.mjs` runners accept an optional Git revision of this repository. The
runner extracts that revision's `packages/toned-core` (and `toned-react` where
needed) with `git archive` into a temporary directory, resolves it against this
checkout's React installation, and measures it beside the current sources with
identical fixtures. Without a revision only the current sources are measured.
A revision older than the APIs a worker uses will fail to run; that is expected.

The design-tools details and results are in [design-tools.md](design-tools.md).

`state-recalc.mjs` and `cascade-browser.mjs` need Playwright with Chromium. It resolves `playwright`
from the working directory first, so run it from a checkout that has it (HQ's
root does): `node vendor/toned/benchmarks/state-recalc.mjs <revision>`.
`cascade-browser.mjs` renders each case of `cascade-browser-cases.ts` (a
shorthand and its longhand, one of them conditional) with the state off, on,
and on an ancestor only, and exits non-zero on the first computed value that
differs from the expected one. On 2026-11-13, Chromium 148: 9 cases, 60
computed values, no failures; with the split disabled, the `transition` and
legacy `padding` cases fail.

### Matcher

`matcher.ts` builds two fixtures: 16 facts and 17 rules (4 axes × 4 values plus
one compound rule), and 80 facts and 81 rules (10 axes × 8 values plus one). For
each it measures compilation, a cache hit, an uncached match, membership
equality, and a plain ordered reference evaluator for scale. Every
implementation is checked against that reference for 512 deterministic states;
the run fails if the current matcher differs, and a baseline's
`reference_mismatches` must be 0 for its timing to mean anything. Each figure is
the median of seven rounds after warmup, in microseconds per operation.

### Controllers and `useStyles`

`completion-worker.ts` is a synthetic 42-cell calendar-shaped workload:

- shared controller construction, and cold compilation of a fresh 43-part
  stylesheet (authoring, normalization, variant expansion and first compile);
- a selected/reset transition across 42 native hosts, then 100 repeated
  identical states, counting host writes and token resolver calls;
- 42 `useStyles` cells mounted in happy-dom, plus hover events that must not
  rerender React;
- 42 children each wrapped in a distinct `StyleOverrides` entry; moving the
  selection must derive exactly the two changed entries;
- SSR markup size in inline and class-name modes, and generated CSS size;
- a WeakRef sample of 5,000 disposed controllers after a new job and forced GC;
- typechecking and declaration emission of an exported 42-part consumer sheet
  with the repository's `tsc`. The run fails if the declaration exceeds 64 KiB.

`--raw-style` adds a four-field raw `style` object to every day part and override;
`--platform-style` puts the same object in both `@platform.web` and
`@platform.native` blocks. Choose at most one. The runner prints a temporary
evidence directory (SSR markup, generated CSS, declarations) on stderr.

### Provider

`provider-worker.ts` mounts the real `TonedProvider` and `createElements` for
lists of 42 and 250 cells and measures mount, a provider update with unchanged
children, a forced child rerender, a variant move, a theme change and SSR. Each
list runs four rounds and reports the median of the last three. It counts host
prop reads and resolver calls for each step, checks that hover does not rerender
React and that host identities survive every update. It also measures spreading
`renderer.t()` 2,000 times, a mount/change/repeat/reset/dispose cycle through a
declared JavaScript native host adapter, and a WeakRef sample of 2,000 disposed
controllers. `--pairs=N` (1–20) repeats the measurement; with a revision, each
pair alternates which version runs first. The report includes a digest of the
measured sources and fails if they change during the run.

### Declared-state recalculation

`state-recalc.mjs` generates the system CSS for 0, 51 and 211 declared states
(`state-recalc-css.ts`, one `data-state` attribute, as a component library's
states are) and lays out 100, 500 and 1,000 rows side by side in one flex
container: each row is a source part with nine styled children, 10 R + 1
elements, and every element reads one state through a custom-property chain.
It reads Chromium's `RecalcStyleDuration` for the first style pass and for
changing one middle row's `data-state`, median of seven rounds, and fails if
the toggled row does not answer the state or its child or the next row does.
The `relations` rows declare both relation channels on every state.

Recorded on 2026-11-13, Chromium 148 headless on an Apple M4 (macOS, load
average about 7), against `bd57f22` ([results/state-recalc.json](results/state-recalc.json)):

| ms, first pass / one toggle | 51 states, 1,001 el. | 51 states, 5,001 el. | 211 states, 5,001 el. | 51 states, 10,001 el. |
| --------------------------- | -------------------: | -------------------: | --------------------: | --------------------: |
| Before (string states)      |          6.25 / 2.36 |        94.92 / 56.71 |       358.28 / 220.35 |       307.35 / 205.12 |
| After, string states        |          0.79 / 0.03 |          4.83 / 0.04 |           5.59 / 0.06 |          12.43 / 0.05 |
| After, both relations       |          4.64 / 2.18 |        78.52 / 52.01 |       313.40 / 215.43 |       293.79 / 203.18 |
| No states                   |          0.74 / 0.00 |          4.65 / 0.00 |           4.65 / 0.00 |          12.08 / 0.00 |

Per declared state and 1,000 elements, a string state now costs 0.0007 to
0.0011 ms of first-pass recalculation and at most 0.0005 ms per toggle, flat
with list length; before it cost 0.10, 0.35 and 0.58 ms at 1,001, 5,001 and
10,001 elements. A state that declares the sibling relation still pays that
quadratic cost, which is why the relation is opt-in.

### A list inside a context

`state-recalc.mjs --contexts=0,10,40` lays the same rows out inside one
provider element, every element reading the provider's value through a
custom-property chain, and changes the provider's value (every row answers;
an element after the provider must not). It measures N declared contexts
(`context`, system/contexts.ts) against the hand-written ancestor states they
replace (`ancestor-selector`: N declared states such as
`':where([data-prose="faq"] *)'`, as the HQ website writes them).

Recorded on 2026-11-14, Chromium 148 headless on an Apple M4 (macOS, load
average about 5), current sources
([results/state-recalc-contexts.json](results/state-recalc-contexts.json)):

| ms, first pass / provider change |   1,002 el. |     5,002 el. |    10,002 el. |
| -------------------------------- | ----------: | ------------: | ------------: |
| None declared                    |    0.77 / 0 |      4.11 / 0 |      9.28 / 0 |
| 10 contexts                      | 0.76 / 0.84 |   4.22 / 4.63 |  9.28 / 10.53 |
| 40 contexts                      | 0.78 / 0.86 |   4.18 / 4.66 |  9.28 / 10.47 |
| 10 ancestor selector states      | 1.29 / 1.33 |   6.64 / 7.05 | 14.37 / 16.57 |
| 40 ancestor selector states      | 2.68 / 2.73 | 13.77 / 14.43 | 28.70 / 30.93 |

A context's rule matches the provider alone, so the first pass does not grow
with the number of declared contexts; an ancestor selector state is checked
by every element, so it grows with each one declared (0.5 ms per 10 states
per 1,000 elements here). Changing the provider's value recalculates the
subtree under it either way, about the cost of its first pass. The CSS is
217 bytes per context with two values, against 186 for one ancestor state.

## Current results

Recorded on 2026-10-02 on an Apple M1 Pro (macOS 27, arm64) with Bun 1.4.2,
Node 26.10 and TypeScript 7.0.2, current sources only. The machine was running other builds at the
time (load average about 13), so absolute timings are inflated and noisy; the
counts are exact. Raw output is in [results/](results/).

### Matcher ([results/matcher.json](results/matcher.json))

| Median, µs per operation | 16 facts / 17 rules | 80 facts / 81 rules |
| ------------------------ | ------------------: | ------------------: |
| Compile                  |               58.89 |              328.51 |
| Cache hit                |               0.093 |               0.489 |
| Uncached match           |               0.827 |               3.112 |
| Membership equality      |               0.013 |               0.027 |
| Reference evaluator      |                1.37 |                6.36 |
| Reference mismatches     |                   0 |                   0 |

Compilation runs once per stylesheet declaration and is shared by every
controller; matches are then served from a bounded state cache.

### Controllers and `useStyles` ([results/completion.json](results/completion.json))

Scalar-token workload:

| Measurement                                          |         Result |
| ---------------------------------------------------- | -------------: |
| Shared controller construction                       |       0.387 µs |
| Cold 43-part stylesheet compilation                  |       342.8 µs |
| Matchers / portable plans shared by 42 controllers   |          1 / 1 |
| Transition / repeated state / reset host writes      |    42 / 0 / 42 |
| Token resolver calls across both transitions         |             84 |
| Warm React mount, 42 cells                           |       3.575 ms |
| Distinct per-child override mount / update           | 9.61 / 3.68 ms |
| Override entries / variant-factory calls on update   |          2 / 2 |
| React renders caused by hover                        |              0 |
| SSR HTML bytes, inline / class-name mode             |  3,273 / 6,535 |
| Generated CSS bytes                                  |          2,959 |
| Consumer typecheck (median of three `tsc` processes) |         505 ms |
| Consumer declaration bytes                           |         34,343 |
| Declaration closure bytes / files                    |   225,197 / 86 |
| Retained disposed controllers                        |      0 / 5,000 |

The declaration closure includes the Toned source declarations the consumer
depends on; it is not the published package's declaration size.

### Provider ([results/provider.json](results/provider.json))

Median of five runs:

| Median, ms                          | 42 cells | 250 cells |
| ----------------------------------- | -------: | --------: |
| Mount                               |     5.48 |     18.21 |
| Provider update, children unchanged |    0.149 |     0.131 |
| Forced child rerender               |     3.43 |     13.54 |
| Variant move                        |     3.27 |     14.05 |
| Theme change                        |     4.80 |     20.31 |
| Server render                       |     1.71 |      6.36 |

Work counts were identical in every run:

| Step                  | Resolver calls (42 / 250) | Host prop reads (42 / 250) |
| --------------------- | ------------------------: | -------------------------: |
| Mount                 |                  43 / 251 |                   42 / 250 |
| Unchanged update      |                     0 / 0 |                      0 / 0 |
| Forced child rerender |                     0 / 0 |                   42 / 250 |
| Variant move          |                     3 / 3 |                   42 / 250 |
| Theme change          |                  43 / 251 |                   42 / 250 |

Spreading `renderer.t()` took 18.1 µs per 2,000 spreads and called the resolver
exactly 2,000 times. The native JavaScript host cycle took 43.5 µs. No sampled
disposed controller was retained.

## Reading the numbers

- Compare timings only between runs on the same machine, runtime and load. Use
  a revision argument for a paired comparison rather than comparing with the
  tables above.
- The counts (writes, resolver calls, renders, derived entries, reference
  mismatches) are deterministic and are the stronger evidence; the runners
  assert them.
- happy-dom does not perform layout or paint, so React timings exclude browser
  rendering. The native host is a JavaScript adapter, not a device or Fabric
  measurement.
- WeakRef samples cover the disposal workload only; they do not prove that an
  application cannot retain objects.
- React runs in its development build. Production-build timings will differ.
