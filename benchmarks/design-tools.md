# Design tooling benchmarks

Two scripts measure `@toned/compiler`'s `DesignProject` index and
`DesignLanguageService` in process. Neither walks the filesystem, executes
project modules or starts the LSP transport. Both are microbenchmarks, not
gates; see [README.md](README.md) for the general caveats.

## Workspace indexing

```sh
bun benchmarks/design-tools.ts 1000 3
bun benchmarks/design-tools.ts 4096 3
node --experimental-strip-types benchmarks/design-tools.ts 1000 3
```

Arguments are the file count (1–4096) and the number of cold samples (1–10).
The fixture is a chain of TSX files, each importing the previous one, with a
twelve-part stylesheet, finite token values, a variant schema and
`createElements`. The script measures:

- cold indexing of the whole workspace;
- one dirty document (100 samples), asserting exactly one parse per update;
- an unchanged document update (1,000 samples), asserting no parse;
- a local symbol lookup plus innermost range (10,000 samples);
- a sheet query page of 100 with an exact total (1,000 samples);
- a token-value completion through `DesignLanguageService`, including position
  conversion and text edits (10,000 samples).

The run fails if any warm operation reparses a document or returns a wrong
result. The shipped language server runs on Node; the Bun runs show scaling.

## Shared design system

```sh
node --experimental-strip-types benchmarks/design-tools-shared.ts 1000
```

One system with 70 finite tokens is imported by 1,000 consumer files. The script
measures cold indexing, the first vocabulary lookup per consumer, a warm value
completion, an unrelated edit followed by a lookup, and a shared-token edit
followed by one consumer's completion. Each step asserts the expected vocabulary,
so a stale result after an edit fails the run.

## Current results

Recorded on 2026-10-02 on an Apple M1 Pro (macOS 27, arm64) with Bun 1.4.2 and
Node 26.10, while other builds were running (load average about 13). Raw output
is in [results/design-tools.json](results/design-tools.json) and
[results/design-tools-shared.json](results/design-tools-shared.json).

| Median, ms                     | Bun, 1,000 files | Bun, 4,096 files | Node, 1,000 files |
| ------------------------------ | ---------------: | ---------------: | ----------------: |
| Cold indexing (3 samples)      |            768.4 |           3064.0 |             924.4 |
| One dirty document             |            1.708 |            4.685 |             1.203 |
| Unchanged document             |          0.00038 |          0.00033 |           0.00183 |
| Local symbol + innermost range |          0.00583 |          0.00667 |           0.00542 |
| Sheet page with exact total    |           0.0682 |           0.4365 |            0.0716 |
| Token-value completion         |           0.0150 |           0.0158 |            0.0162 |

The 1,000- and 4,096-file workspaces contain 1.71 and 7.02 million characters
and 90,000 and 368,640 design nodes.

| Shared system, 1,000 consumers (Node) | Median, ms |
| ------------------------------------- | ---------: |
| Cold indexing (1 sample)              |      118.1 |
| First vocabulary lookup per consumer  |    0.00925 |
| Warm value completion                 |    0.00279 |
| Unrelated edit and lookup             |    0.02662 |
| Shared token edit and completion      |      2.170 |

## Limits

- Cold indexing scales with workspace size, and exact query totals scan their
  indexed bucket. Dirty updates, unchanged updates and local lookups do not
  rescan the workspace; the scripts assert the parse counts.
- Three cold samples give a coarse range, not a tail-latency estimate.
- Disk discovery, JSON-RPC transport, editor UI, TypeScript's full semantic
  service and retained heap are not measured. Memory figures in the shared
  report are unforced process observations, not retained-heap measurements.
