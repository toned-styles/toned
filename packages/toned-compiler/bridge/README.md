# Development source bridge

`createSourceBridge({ root, files })` implements the browser inspector's asynchronous
query/document/propose/apply transport against real source files. `files` is a finite
explicit allowlist, not a glob or recursive workspace scan. All paths must remain
inside the canonical root. Symlink path components, nonregular or multiply linked
files, invalid UTF-8 and oversized sources are refused. The bridge parses code
through `DesignProject`; it never imports or executes the application modules.

Queries refresh the selected allowlisted file or the finite allowlist. Unchanged
text uses the index's unchanged-document path. There is no background watcher.
Applications should own one bridge per workspace, dispose it on shutdown, and
configure a smaller file list for a component-specific tool.

```ts
const bridge = await createSourceBridge({
  root: workspaceRoot,
  files: ['src/button.styles.ts', 'src/tokens.ts'],
})
const handler = createSourceBridgeHandler(bridge, {
  origin: 'http://localhost:5173',
  token: cryptographicallyRandomDevelopmentCapability,
})
// Attach handler to the application's own authenticated development server.
// During shutdown:
await bridge.dispose()
```

Proposals come from `proposeValueEdit` after shared request validation. Each receives
a random server-issued `proposalId` and expiry. A private server copy supplies all
edit bytes; apply refuses modified, unknown, evicted, consumed or expired proposals.
The inspector retains these additional protocol fields transparently. Literal
values, source scopes and expected versions use the same bounded validation as
CLI/LSP requests. Clients cannot submit a new `edit.after` as write authority.

Bridge operations serialize through a bounded queue. Apply checks document version,
revision and exact preimage with `applyDesignEdit`, validates the resulting source
and budgets, writes and fsyncs a sibling temporary file, then rechecks the entire
source and file identity before atomic rename. Source mode bits are preserved.
Failures before replacement leave source untouched and remove the temporary file;
a cleanup failure is reported explicitly with its path. The proposal is consumed
on a write attempt, so an error needs a fresh preview.

Cancellation is checked while queued, reading and before replacement. After rename
starts, cancellation cannot undo a committed edit; a successful replacement returns
the committed document. A disconnected client must refresh rather than assume that
an aborted request implies rollback. Disposal rejects queued/new work, waits for
active operations and clears retained proposals/documents.

Atomicity covers bridge-owned operations and whole-file replacement. Portable Node
filesystem APIs do not provide compare-and-swap against an unrelated editor/process
writing between the final read and rename. Such writers must coordinate externally
or pause during apply; this bridge does not claim to eliminate that final race.
Likewise, containment assumes workspace directories are not adversarially renamed
concurrently. Checks reject ordinary traversal/symlink escapes; they are not an OS
sandbox. Rename is not a guarantee of crash durability for directory metadata.

## HTTP and Vite

`createSourceBridgeHandler` accepts only JSON POST requests with a bearer capability
and the exact configured development Origin. It adds no permissive CORS headers.
Body size, concurrent requests and request duration are bounded. The browser helper
`createHttpInspectorTransport({ endpoint, token })` sends capabilities in a header,
not a URL. The same-origin browser supplies Origin automatically.

`sourceBridgePlugin({ root, files, origin })` is an optional structural Vite plugin
with `apply: 'serve'`; no Vite dependency is required. `origin` may be a callback for
an owned server that chooses an ephemeral port. The plugin installs after Vite's
host/access middleware and exposes a development virtual module:

```ts
// Development entry only; do not import the virtual module in production builds.
import { endpoint, token } from 'virtual:toned-source-bridge'
import { createHttpInspectorTransport, mountDesignInspector } from '@toned/compiler/inspector'
mountDesignInspector(panel, {
  transport: createHttpInspectorTransport({ endpoint, token }),
})
```

The random capability prevents arbitrary web origins from issuing source writes.
Anyone authorized to read the development virtual module can obtain it, so the
existing development server's access controls remain necessary. The plugin closes
the bridge with its server or plugin lifecycle, including middleware mode.

Defaults: 256 files, 1 MB per file, 8 million indexed characters, 128 pending
proposals, five-minute proposal TTL, and 128 queued operations. HTTP defaults are
128 KiB per request, 16 concurrent requests and a 10-second deadline. Configuration
has finite upper limits; overload returns an error instead of growing queues.
