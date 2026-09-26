# Design tools

`@toned/compiler` connects Toned declarations to their source. Its language
server, inspector and agent-facing operations use the same bounded source index.
It is optional: normal core/React imports do not load TypeScript, filesystem or
editor code. Install it as a development dependency alongside Toned.

## Source intelligence

```ts
import { DesignProject, proposeValueEdit, applyDesignEdit } from '@toned/compiler'

const project = new DesignProject()
project.update('file:///app/button.ts', sourceText, 1)
const page = project.query({ kind: 'sheet', limit: 50 })
// Follow page.next using query({ ...filter, offset: page.next }).
const declarations = project.query({ owner: 'buttonStyles', kind: 'declaration', limit: 50 })
```

The graph includes systems, finite token vocabularies, sheets, parts, literal
values, variant axes, component families and declared module dependencies. Each
node has UTF-16 source ranges, an owning declaration and a condition path. Source
revisions invalidate changed documents; warm navigation and completion reuse the
index. `statistics` reports actual parse/reuse counts. `dispose()` releases it.

Source analysis never executes application modules, token resolvers or factories.
It reads supported static object/factory declarations and local type definitions.
Computed JavaScript, unsupported control flow, imported type domains and spreads
that cannot be established statically are explicitly opaque. The TypeScript
service remains authoritative for type checking; the runtime plan and renderer
remain authoritative for precedence and resolved values. A dependency report is
an impact inventory, not proof that every affected rendering has been exercised.

Default budgets are 4096 documents, 32 million source characters, one million
characters per document and 20,000 design nodes per document. Queries return at
most 500 nodes and include total/next/revision. Narrow the workspace or adjust
supported limits explicitly when an index is incomplete.

See [source analysis boundaries](./SOURCE.md) for the supported syntax, symbol
resolution, per-operation budgets and edit validation. These limits also apply
to the LSP, inspector and CLI; an opaque source expression stays opaque through
each interface.

## Language server and CLI

```sh
toned-lsp --stdio
toned inspect ./src sheet
toned inspect ./src declaration --offset=0 --limit=100
toned propose ./src '<JSON scoped edit request>'
```

Configure an LSP 3.17 client to run `toned-lsp --stdio` for TypeScript, TSX,
JavaScript and JSX files, alongside its usual TypeScript language server.
Completion, hover, definition, references, document symbols, diagnostics and
literal-value code actions share the design index. Open-document snapshots
take precedence over disk. The server requests full-document synchronization:
this lets it discard oversized text while retaining a bounded open marker, then
recover on the next valid snapshot without losing unsaved-editor ownership.
Parsing remains coalesced and restricted to changed documents; this trades
additional editor-to-server bytes for bounded memory and reliable recovery. Closed files are restored from disk; watched
file notifications refresh unopened documents. Clients with dynamic file watching
receive registrations; other clients must send `workspace/didChangeWatchedFiles`.
Workspace roots are fixed at initialization (restart after changing roots).

Custom JSON-RPC requests:

| Request | Input | Result |
| --- | --- | --- |
| `toned/inspect` | query filters, offset, limit | bounded design page |
| `toned/statistics` | none | work counts and workspace indexing status |
| `toned/proposeEdit` | scoped edit request | change report + versioned WorkspaceEdit |

`toned.setValue` is an explicit execute-command operation that asks the editor to
apply that edit. Open documents carry their editor version; closed documents use
`version: null` as required by LSP, while the proposal still validates the indexed
source revision. The editor controls applying closed-file edits. For embedding, `@toned/compiler/lsp` exports
`startLanguageServer({ input, output })`, returning an idempotent `dispose()`.
The server accepts up to 16 file workspace roots. Initial indexing yields between
files, skips generated/dependency directories and reports budget failures.
No whole-project typecheck runs on a completion request.

An edit request supplies `nodeId`, `value`, `expectedVersion` and
`scope: { uri, owner, path? }`. `proposeValueEdit` returns an exact before/after
patch; `applyDesignEdit(text, version, change.edit)` validates the revision and
preimage and returns new text. These pure APIs do not write files. Proposals
cannot edit opaque expressions or escape their declared source scope. Run the
project's typecheck/build and relevant contract tests after applying a patch.

## Inspector and persistence

The [browser inspector](./inspector/README.md) edits the same declarations using
an async transport. The [source bridge](./bridge/README.md) supplies development
persistence for an explicit file allowlist, version checks and issued proposals.
An inspector integration passes source URI/sheet/part selection explicitly; it
must not guess a shared token's ownership from a computed color. Inspector code
has no runtime compiler imports and does not require React or a JSX pragma.

Import browser UI and its HTTP transport from `@toned/compiler/inspector`.
Import filesystem persistence, the HTTP handler and `sourceBridgePlugin` from
`@toned/compiler/bridge` in development server code. The Vite plugin uses an
explicit file allowlist and exposes `virtual:toned-source-bridge` only during
development; its capability and write transport must stay out of production
entries. The bridge documentation covers cancellation, atomic replacement and
the remaining race with unrelated external file writers.

## Verification and interchange

- [Contracts](./contracts/README.md): bounded scenarios, measured policies and
  counterexamples with declaration provenance. Missing observations produce an
  inconclusive result. Sampling is explicitly reported; it is not exhaustive or
  pairwise coverage.
- [DTCG](./tokens/README.md): explicit import/export, metadata/alias retention,
  theme mapping and finite context resolution. Unsupported types are diagnosed;
  this is a documented subset, not a claim of complete DTCG conformance.

These tools do not replace the build's explicit sheet inventory. Use
`buildStyles` from `@toned/core/build` and its manifest to deliver CSS, and
`renderer.explain` to connect contract failures to resolved declaration origins.
See HQ's `scripts/build/toned-design-browser.ts` for an executable integration
that edits a real disposable source file, rebuilds its preview, detects stale
patches and checks adaptive layout, motion and measured counterexamples.
