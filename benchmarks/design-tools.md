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
