# Development source inspector

`mountDesignInspector(container, { transport, selection?, pageSize? })` mounts an
optional browser panel. It imports only protocol types from the compiler and does
not include TypeScript, Node APIs, React, or production Toned runtime code.

The transport connects to the same `DesignProject`, `proposeValueEdit` and checked
`applyDesignEdit` used by editor/agent tooling. Its query/document/propose/apply
methods are asynchronous and receive an AbortSignal. The application controls
source access, authentication, allowed workspaces and persistence. Do not expose a
write transport on a production site or an unauthenticated network endpoint.

```ts
const inspector = mountDesignInspector(panel, {
  transport: developmentSourceBridge,
  selection: { uri: sourceUri, owner: 'buttonStyles', part: 'Root' },
})
// Selecting a preview element can call inspector.select({ uri, owner, part }).
// On development panel unmount:
inspector.dispose()
```

The panel displays sheet/declaration names, part and condition paths, exact source
ranges, current version, and explanations for opaque values. Direct literals can
use finite token choices when their local owning system is known, or JSON input.
It never executes an expression or silently replaces a shared constant with its
resolved value. Proposal previews show before/after source, scope, affected files
and the index's stated impact limitations.

Apply re-reads and checks source version, revision and original span before calling
the transport. **The transport must perform the same checks atomically with the
write**: the browser check cannot prevent a race after its read. Failed checks
must leave source untouched. A successful response must return the updated source
document with a newer version. Source edits still require the owning type and
renderer checks; an indexed literal change is not semantic validation.

Queries are paginated (default 100, maximum 500 declarations per page). Large
workspace sheet lists show their truncation and permit an exact integration-driven
selection. A selected-part filter applies to each declaration page and says so.
This bounds DOM work without claiming omitted sheets/declarations do not exist.
All source strings use textContent, never HTML. New selections and input changes
invalidate pending requests; disposal aborts requests and removes the panel.
