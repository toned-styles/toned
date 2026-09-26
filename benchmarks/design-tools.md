# Design index measurements

Run `bun benchmarks/design-tools.ts 1000 3` or replace 1000 with the configured
maximum of 4096. The bounded fixture uses twelve-part TSX sheets, finite token
values and variant schemas, and a chain of relative imports. The script asserts
that exactly one file is parsed per dirty update and no warm operation reparses.

Measured locally on Bun 1.3.14 on 2026-09-26: Apple M4, arm64,
darwin 27.0.0.

| Operation (median milliseconds) | 1,000 files / 90,000 nodes | 4,096 files / 368,640 nodes |
| --- | ---: | ---: |
| Cold whole-project indexing, 3 samples | 1317.77604 | 3743.06308 |
| One dirty document, 100 samples | 0.55783 | 0.39946 |
| Unchanged document, 1,000 samples | 0.00071 | 0.00117 |
| Local symbol + innermost range, 10,000 samples | 0.00300 | 0.00392 |
| Sheet page with exact total, 1,000 samples | 0.04592 | 0.24671 |

The source sizes were 1.71 and 7.02 million UTF-16 characters. Cold p95 was 1357ms
and 5724ms; dirty-document p95 was 2.425ms and 2.638ms. Machine-readable measurements
and sample counts are in `design-tools-results.json`.

The final run shared the machine with other integration work and has substantial
scheduling noise (especially page-query p95). Treat these as observed bounds for
this run, not isolated CPU latency. These are absolute measurements, not a speedup claim over an unmeasured version.
Three cold samples provide a coarse range, not a stable tail-latency estimate.
Cold indexing still scales with workspace size, and exact query totals scan their
indexed bucket. Dirty-document parsing, unchanged updates and local lookups avoid
whole-workspace rescans. This fixture excludes disk discovery, transport,
TypeScript's full semantic service, rendering and device/browser checks. Retained
heap was not measured; document/node counts are structural evidence only.

Actual token-value completion was also measured through `DesignLanguageService`
(position conversion, token lookup and all four text edits), 10,000 requests per
workspace after warming document wrappers. It performed no additional parses.

| Warm completion | 1,000 files | 4,096 files |
| --- | ---: | ---: |
| Median ms | 0.00492 | 0.00896 |
| p95 ms | 0.00788 | 0.01229 |

This measures service completion work, not JSON-RPC transport or VS Code UI time.

## Node execution

The shipped LSP uses Node, so the same 1,000-file fixture was also measured under
Node v26.8.1 with `node --experimental-strip-types benchmarks/design-tools.ts 1000 3`.
This is a separate observation, not a runtime-speed comparison: CPU contention
and runtime warmup differ between runs. The no-reparse assertions also passed.

| Node operation | Median ms | p95 ms |
| --- | ---: | ---: |
| Cold index (3 samples) | 428.18358 | 431.54725 |
| One dirty document (100) | 0.42417 | 0.47300 |
| Unchanged document (1,000) | 0.00067 | 0.00100 |
| Local symbol + range (10,000) | 0.00088 | 0.00279 |
| Sheet page + exact total (1,000) | 0.04417 | 0.09738 |
| Actual token completion (10,000) | 0.00658 | 0.00917 |

## Shared systems and real HQ editing (2026-09-26)

The earlier local-system fixture does not represent a shared design-system edit.
The new [raw receipt](./design-tools-lsp.results.json) records three alternating
fresh Node server runs for baseline `7e3944c` and the optimized source hashes in
that receipt. Both used the same HQ configuration: 1,005 files and 5,429,016 source
characters. The baseline archive was instrumented only to expose process memory
in `toned/statistics`. No application modules or resolvers ran; all edits were
unsaved editor buffers, and source-file integrity assertions passed.

| Real HQ protocol scenario | Baseline median ms | Optimized median ms |
| --- | ---: | ---: |
| First usable Daylight value completion during indexing | 280.40 | 219.92 |
| Full workspace indexing | 1121.39 | 1115.92 |
| Warm completion round trip | 0.186 | 0.193 |
| Unrelated component edit followed by completion | 1.255 | 0.885 |
| Shared Daylight token edit followed by current-value completion | 7.423 | 7.560 |
| 64 queued changes to one unrelated component, then completion | 41.518 | 25.460 |

First completion polls every 50ms until the expected value exists, so its result
includes polling granularity. Warm round trips are below a millisecond; these
samples do not establish a warm-request improvement. Shared-token editing and
full indexing are effectively similar here. First completion and burst latency
improved in these runs, without claiming every workload gets faster. Background
loads may still progress while requests run; scheduling tests separately prove
that a requested document and its current dependencies precede 100 unrelated
queued documents, including import changes and formerly missing targets during
a yield. Cancelled requests release their admission slot.

After the editing scenarios, median observational RSS was 254.38 MiB baseline
and 255.03 MiB optimized; heap used was 62.31 versus 66.58 MiB. GC was not forced,
so these are process observations, not retained-heap measurements, memory savings
or a leak proof. Cache retention has independent structural bounds and eviction
regressions. OS filesystem caches were not flushed, and the machine/runtime are
recorded in the receipt.

`node --experimental-strip-types benchmarks/design-tools-shared.ts 1000` measures
an additional synthetic system with 70 finite tokens shared by 1,000 consumers.
An optional second argument selects an isolated compiler source directory for a
baseline. One paired run observed these service-only medians:

| Shared-system synthetic scenario | Baseline ms | Optimized ms |
| --- | ---: | ---: |
| Cold source indexing | 50.827 | 51.918 |
| First vocabulary lookup per consumer | 0.01104 | 0.00554 |
| Warm value completion | 0.00304 | 0.00154 |
| Tiny unrelated edit and vocabulary lookup | 0.02646 | 0.01271 |
| Shared token edit and one consumer completion | 0.76354 | 1.03463 |

Shared-token invalidation touches the dependency graph and bounded caches; this
single-consumer-after-shared-edit case paid about 0.27ms more in the observed run.
The same shared caches reduce repeated resolution across consumers. These results
justify retaining the bounded dependency-aware design, not a universal speedup
claim. The scripts assert correct vocabularies after edits; timing thresholds are
not CI gates. HQ's `scripts/build/test-toned-lsp.ts` runs the real protocol
scenarios, and accepts `--serverBundle <isolated baseline bundle>` for paired
measurements. See `scripts/build/__tests__/fixtures/toned-lsp-performance.ts` for the bounded edits.

## Post-review LSP checks at `2ef2d02`

A further three alternating fresh-server pairs compare baseline `7e3944c` with
`2ef2d02`, including dependency-revision validation and serialized disk publication.
The updated HQ workspace contains 1,007 files and 5,440,076 source characters.
All six protocol acceptance runs passed, including current-value completion after
shared-token edits, source integrity and stale-edit rejection. The complete new
receipt is `design-tools-lsp-review.results.json`; the earlier receipt above is
retained as historical evidence. Both receipts redact the developer workspace URI.

| Real HQ protocol scenario | Baseline median ms | Reviewed median ms |
| --- | ---: | ---: |
| First usable Daylight completion during indexing | 290.62 | 219.13 |
| Full workspace indexing | 1136.35 | 1185.01 |
| Warm completion round trip | 0.223 | 0.181 |
| Unrelated component edit followed by completion | 1.286 | 0.908 |
| Shared Daylight token edit followed by current-value completion | 8.063 | 7.539 |
| 64 queued changes, then completion | 42.274 | 26.224 |

First usable completion and burst handling improved in these samples. Full
indexing was about 4.3% slower by median; the three reviewed runs ranged from
1172.21 to 1455.63ms, so this is not an isolated measurement of the disk queue's
cost. Warm submillisecond requests and the small shared-token difference do not
establish reliable gains. No machine-dependent timing threshold is a test gate.

Median RSS after the scenarios was 256.22 MiB baseline versus 254.19 MiB reviewed;
heap used was 66.75 versus 77.36 MiB. GC was not forced, so the higher heap reading
is an observation, not a retained-memory conclusion. The dependency-revision map
has one entry per indexed document; the disk queue allows 128 distinct files and
one coalesced follow-up each. Guarded regressions separately establish large
cyclic-graph responsiveness, negative-import invalidation, request cancellation,
ordered disk reads, deletion/recreation and unsaved-buffer precedence. The
256-file/1024-candidate initial-demand bounds and cooperative request limits
remain; this work does not turn finite indexing into unlimited project analysis.
