# Matcher benchmark

Run `node benchmarks/compare-matcher.mjs [checkpoint]` from the Toned checkout. The runner extracts the reviewed checkpoint into an OS temporary directory, then runs both implementations against identical deterministic fixtures in the same Bun process. Inside HQ it uses the repository test preloads and refuses any recorded network or filesystem guard violation. No repository checkout is changed.

This is a microbenchmark, not a performance gate. It measures seven rounds after warmup and reports median/minimum/maximum microseconds per operation. The small fixture has 16 facts and 17 rules; the large fixture has 80 facts and 81 rules. Each implementation is also checked against a plain ordered evaluator for 512 states. Property order is ignored when checking equality.

Measured on macOS arm64 with Bun 1.3.14. Other implementation work was running on the machine, so these figures should be repeated on an idle machine before treating differences as release targets. This benchmark does not measure React render counts, host writes, layout, or mobile-device behavior.

| Fixture | Version | Incorrect states | Compile µs | Cache hit µs | Uncached match µs | Equality µs | Reference evaluator µs |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| small-16-facts | checkpoint | 0 | 52.721 | 0.264 | 0.308 | 0.014 | 2.771 |
| small-16-facts | current | 0 | 88.43 | 0.197 | 0.699 | 0.011 | 1.326 |
| large-80-facts | checkpoint | 512 | 358.225 | 0.271 | 0.437 | 0.014 | 6.325 |
| large-80-facts | current | 0 | 438.41 | 0.835 | 8.981 | 0.046 | 6.868 |

Rule parts and operation arrays are pre-indexed during compilation, and exact result metadata is held in a WeakMap. Updates do not enumerate rule objects or create metadata properties on every result. The current small-plan cache-hit path remains comparable in this run. Construction and uncached matching are slower: ordered operation provenance and exact membership add work that the checkpoint omitted. Keep compilation shared by stylesheet and use the bounded state cache; do not move declaration construction into update paths. The large checkpoint produced the wrong result for every sampled state because its fact bits wrap after 32, so its lower match time is not a valid performance target. The current implementation matched the reference for every state in both fixtures.

Large plans now select candidate rules using one necessary positive fact before
checking the complete predicate. OR-only and negated expressions remain in a
fallback bucket; original rule order and exact membership are preserved. Small
plans still scan directly, and fallback-only/dense selections avoid pointless
sorting. Further optimization must preserve differential checks and measure cold
compilation, cache misses and host writes separately. Never replace exact identity
with a folded hash to recover the old timing.

## September 18 follow-up against the previously delivered version

The following run compares `1733fea` with the subsequent controller/index cleanup,
not with the original checkpoint. Both versions produce correct results in all
512 matcher states. The runner now extracts the complete historical core package
and detects its available host/build APIs, so a recent comparison cannot borrow
current helper modules or accidentally use the original checkpoint's host protocol.

| Measurement | `1733fea` | Follow-up |
| --- | ---: | ---: |
| Small matcher compilation, µs | 43.874 | 47.686 |
| Small uncached match, µs | 0.447 | 0.423 |
| Large matcher compilation, µs | 221.951 | 230.587 |
| Large uncached match, µs | 5.022 | 2.319 |
| Large cache hit, µs | 0.455 | 0.330 |
| Shared controller construction, µs | 0.618 | 0.406 |
| Cold 43-part compilation, µs | 276.168 | 295.213 |
| Warm React mount, ms | 1.848 | 2.004 |
| Distinct override mount / update, ms | 6.440 / 2.315 | 7.294 / 2.934 |

Candidate indexing approximately halves this large fixture's uncached matching;
shared construction improves by about a third. Two earlier paired runs also
showed shared construction improving from 0.637–0.639 to 0.400 µs. These are
specific gains, not a general performance claim: the final run's cold compilation
and React timings are slower, and override mounting was slower in each paired
run. Ordinary mount and override-update timings varied in direction between runs.
Measurements use a shared development machine, not an isolated benchmark host.

The structural improvement is independently tested: immutable relation/state/
condition metadata is shared by matcher, and pure render candidates allocate no
mounted-family maps or listeners. Prepared candidates reuse committed family
identity without changing its owner. The measured 42/0/42 host writes, 84 resolver
calls, two changed override derivations, zero interaction renders, unchanged
SSR/CSS sizes and zero retained disposed-controller samples remain intact.
Consumer declaration output stays below its 64 KiB budget. Do not interpret
byte differences between a temporary extracted package and the workspace as an
API-size reduction: TypeScript's inferred imports depend on that resolution layout.

## Controller, host, React and typechecking acceptance

Run `node benchmarks/completion.mjs [checkpoint]` with HQ's root dependencies
installed. The default checkpoint is the original pinned `ebd10355`. The runner
extracts both core and React source into an OS temporary directory and resolves
both versions against the same physical React installation. No installation or
checkout mutation occurs. Each version runs in a separate guarded Bun process;
network and filesystem refusal logs must be empty. The TypeScript 7 consumer
check runs through the guarded Node launcher (its native compiler is outside JS
instrumentation, as in the main Toned gate).

This is a **synthetic 42-cell calendar-shaped workload**, not the complete HQ
Calendar component. It measures fresh 43-part stylesheet authoring, normalization
and first controller compilation separately from shared controller construction;
a selected/reset transition across 42 hosts; repeated identical updates; actual
`useStyles` React mounts/updates/hover events in happy-dom; WeakRef retention of
5,000 disposed controllers; and a representative exported 42-part consumer's
typecheck and declaration emission.

The second React workload mirrors HQ Calendar's `dayButtonEntry -> StyleOverrides
-> Button` path: 42 children have distinct override entries, including a unique
numeric token and selection/week-edge-like conditions. Moving selection changes
exactly two entries; a declaration-factory counter measures actual derived-sheet
construction independently of React rendering. This exercises the real override
pipeline through public APIs, without importing HQ's day picker or theme graph.
It reports mount/update time, SSR UTF-8 HTML bytes in inline and CSS modes,
generated CSS UTF-8 bytes for the fixture system, and both the exported consumer's
`.d.ts` size and its emitted source-dependency declaration closure size. Sizes are
uncompressed; closure size is not the published package's total declaration size.
The historical generator and current build entry each emit their complete default
CSS support for the same system; extra current CSS is measured, not stripped for
comparison. It does not measure
browser layout, GPU work, mobile devices or the whole application's import graph.
Construction reports the median of five warm batches; React mounting discards its
first run and reports the median of five subsequent mounts; typechecking reports
the median of three fresh compiler processes. The disposal sample holds only
WeakRefs to 5,000 disposed controllers, advances to another event-loop job, then
forces GC and reports how many targets remain. That count is observational;
it checks this disposal workload, not arbitrary application retention. Current
controllers additionally must share one actual portable plan as well as one
compatibility matcher. The evidence directory retains both SSR outputs and the
generated CSS so size changes can be inspected directly.

On macOS arm64/Bun 1.3.14, the 2026-09-16 run before round-three review
fixes reported the following. These timing rows describe that measured revision;
the current-only gate below is rerun separately after review fixes.

| Measurement | Checkpoint | Current |
| --- | ---: | ---: |
| Shared controller construction, µs | 0.269 | 0.581 |
| Cold 43-part stylesheet compilation, µs | 44.412 | 289.73 |
| Shared matcher instances for 42 controllers | 1 | 1 |
| Shared portable plan instances for 42 controllers | — | 1 |
| Changed transition / repeated state / reset writes | 42 / 0 / 42 | 42 / 0 / 42 |
| Token resolver calls across transitions | 84 | 84 |
| Warm React mount, ms | 1.276 | 2.467 |
| Distinct per-child override mount / update, ms | 3.8 / 1.576 | 5.999 / 2.699 |
| Override entry creations, mount / update | 42 / 2 | 42 / 2 |
| Override variant-factory calls, mount / update | 84 / 84 | 42 / 2 |
| Styling interaction React renders | 0 | 0 |
| SSR HTML bytes, inline / CSS modes | 3,273 / 6,535 | 3,273 / 6,535 |
| Generated CSS bytes | 1,196 | 2,959 |
| Representative consumer typecheck, ms | 495.25 | 594.8 |
| Plain inferred exported sheet declaration emit | TS4023 | Pass |
| Consumer declaration bytes | 129,460* | 48,602 |
| Emitted declaration closure bytes / files | 215,917 / 30* | 205,772 / 71 |
| Retained disposed controllers / WeakRef samples | 0 / 5,000 | 0 / 5,000 |

*The checkpoint cannot emit the plain inferred export: it requires the documented
`SYMBOL_INIT`, `SYMBOL_REF` and `_internalBrand` type imports. Its byte measurements
use those imports, retaining complete inference; the unmodified failure remains
in the JSON report. Current emission needs no symbol imports or broad annotation.
The named public metadata/result types reduce this consumer's declaration size by
about 62%. Closure size counts source dependencies too, so it measures a different
thing and does not shrink proportionally.

These results do not establish a general speedup. Every reported timing is slower
in this run: cold compilation is about 6.5× the checkpoint (290 versus 44 µs),
shared construction about 2.2×, React mounting about 1.9×, and the distinct-override
mount/update about 1.6×/1.7×. The current cold path builds both the compatibility
matcher and the portable operation plan, retaining declaration provenance and
lowering token fields; the timing includes that additional construction work. Both
plans are shared by warm controllers, but their warm lifecycle still costs more
in this fixture. These measurements expose that cost; they do not attribute all
of the difference to one mechanism or establish a whole-application slowdown.
The operation cache keeps resolver calls equal to the checkpoint. The checkpoint
invokes each override factory twice per derivation;
current invokes it once. The 42-child update used to rebuild all 42 current
variants because a 32-entry cache could not retain the siblings. Raising its bound
to 64 reduces factory calls to the two changed entries; the regression assertion
fails at 32. This is a measured reduction in work, even though timings do not show
a blanket speedup. Current CSS includes interaction toggles even without viewport
breakpoints
(the checkpoint accidentally omitted them for this fixture) and negated-state
channels. Its complete fixture stylesheet is therefore larger while SSR markup is
unchanged after unused generated parameter slots are pruned; the smaller historical
stylesheet is not an equivalent-capability target. Typecheck timing
varies substantially on the shared machine. Stable counts and the 64 KiB inferred
consumer declaration budget are stronger release checks than noisy timings.

The current-only gate rerun after round-three review fixes also passed: one
matcher and one portable plan, 42/0/42 writes, 84 resolver calls, two changed
override derivations,
zero styling renders, and a 48,602-byte inferred consumer declaration. Both runs
observed zero retained targets out of 5,000 disposed-controller WeakRefs. These
are clean results for the measured disposal sample, not a proof
that arbitrary native host integrations or application ownership cannot retain
objects. An earlier revision also reported a zero `process.memoryUsage().heapUsed`
delta; that metric has been removed because Bun 1.3.14's same-job readings did not
track live JS object allocation. It was not credible evidence of retained heap.
The complete source declaration closure in that rerun is 205,855 bytes across 71
files; the consumer declaration reduction remains about 62%.

`node benchmarks/completion.mjs --current-only` requires no historical checkout
and is suitable for CI. It fails if a current consumer stops typechecking, if 42
controllers stop sharing one matcher and one portable plan, if a transition writes
other than once per
host, if an identical state writes again, if resolver calls exceed the two changed
transitions per host, if an imperative styling interaction causes a React render,
if a 42-child selection move derives more than the two changed override entries,
or if the exported consumer fails declaration emission or exceeds 64 KiB. No
absolute wall-clock or heap threshold is enforced.
