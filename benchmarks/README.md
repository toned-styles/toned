# Matcher benchmark

Run `node benchmarks/compare-matcher.mjs` from the Toned checkout. The runner extracts the reviewed checkpoint into an OS temporary directory, then runs both implementations against identical deterministic fixtures in the same Bun process. Inside HQ it uses the repository test preloads and refuses any recorded network access. No repository checkout is changed.

This is a microbenchmark, not a performance gate. It measures seven rounds after warmup and reports median/minimum/maximum microseconds per operation. The small fixture has 16 facts and 17 rules; the large fixture has 80 facts and 81 rules. Each implementation is also checked against a plain ordered evaluator for 512 states. Property order is ignored when checking equality.

Measured on macOS arm64 with Bun 1.3.14. Other implementation work was running on the machine, so these figures should be repeated on an idle machine before treating differences as release targets. This benchmark does not measure React render counts, host writes, layout, or mobile-device behavior.

| Fixture | Version | Incorrect states | Compile µs | Cache hit µs | Uncached match µs | Equality µs | Reference evaluator µs |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| small-16-facts | checkpoint | 0 | 52.721 | 0.264 | 0.308 | 0.014 | 2.771 |
| small-16-facts | current | 0 | 88.43 | 0.197 | 0.699 | 0.011 | 1.326 |
| large-80-facts | checkpoint | 512 | 358.225 | 0.271 | 0.437 | 0.014 | 6.325 |
| large-80-facts | current | 0 | 438.41 | 0.835 | 8.981 | 0.046 | 6.868 |

Rule parts and operation arrays are pre-indexed during compilation, and exact result metadata is held in a WeakMap. Updates do not enumerate rule objects or create metadata properties on every result. The current small-plan cache-hit path remains comparable in this run. Construction and uncached matching are slower: ordered operation provenance and exact membership add work that the checkpoint omitted. Keep compilation shared by stylesheet and use the bounded state cache; do not move declaration construction into update paths. The large checkpoint produced the wrong result for every sampled state because its fact bits wrap after 32, so its lower match time is not a valid performance target. The current implementation matched the reference for every state in both fixtures.

Future optimization should preserve the same differential checks and measure normalization, cache misses and host writes separately. Output operations are already pre-indexed; remaining costs include scanning every compiled rule on a cache miss, allocating exact membership vectors for affected parts, and replaying token operations to resolve overlapping CSS fields. Dependency-based rule scans, shared immutable membership data, and compiled token-to-field metadata are candidates to measure. Do not replace exact identity with a folded hash to recover the old timing.
