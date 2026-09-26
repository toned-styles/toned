# Source index and edits

`DesignProject` owns immutable serializable documents, source ranges, symbols and
module dependency edges. It does not retain TypeScript syntax trees or
execute application code. Updating one changed document reparses that document;
identical text only updates its immutable version wrapper. `remove` and `dispose`
release document, symbol, range and dependency indexes together.

The parser recognizes the ordinary syntactic forms of `defineSystem`, `defineToken`,
`stylesheet`, `.variants`, and `createElements`. Literal values and finite local type
aliases are inspectable. It uses lexical bindings to avoid resolving a parameter,
block binding or hoisted local `var` as an unrelated module constant or reference.
Only module `const` initializers are eligible for literal inspection; references
to such constants remain noneditable at their use site.

A factory can be expanded only when it directly returns an object (concise arrow
or a body containing only one return). Loops, switches, try/finally, conditional
returns and other statements stay opaque. Stylesheet-body spreads, shorthand, methods and dynamic
computed keys are not executed or guessed. Token-system composition separately
recognizes static object spreads, shorthand, namespace exports, named re-exports
and object rest destructuring. Later properties replace earlier token definitions;
an opaque spread invalidates preceding names that it might override. Syntax errors and exhausted static
expansion budgets appear as diagnostics. Model values describe source declarations;
they do not certify runtime behavior or prove that another statement never mutates
a referenced object. Renderer and TypeScript checks remain necessary.

Definitions follow indexed named/namespace imports, named and star re-exports,
stylesheet aliases, and module-level bindings. Hosts can call
`configureModules(rootUri, mappings)` with explicit exact or single-wildcard module
paths constrained to their configured workspace root after URL resolution (for example `{"@lib/*":["lib/*"]}`). The server
accepts this JSON map through `initializationOptions.toned.modules`; it never executes
configuration files or implicitly traverses node_modules. Include the token source
directories in the host's indexed workspace. `tokensForSystem(name, uri)` returns
the effective known token definitions, preserving their original source locations.
`defineCssToken` is recognized alongside `defineToken`; nonliteral value domains
remain dynamic. Literal members of open domains are suggestions, with
`valuesComplete: false`; numeric constructors and alpha-channel modifiers do not
produce false finite-domain warnings. Default-export expressions and generated/dynamic imports still
need the owning TypeScript language service or runtime evidence. References remain
limited to named lexical bindings in the declaring module and direct importers.
Part names and token field names are not
lexical JavaScript bindings: spelling matches are not reported as references.
This finite index complements TypeScript semantic checking; it does not replace it.

Default project budgets are 4,096 files, 32 million UTF-16 characters total,
1 million characters per document, and 20,000 design nodes per document. Budget
violations fail visibly and preserve the previous document. Each parse also bounds
syntax visits (200,000), lexical scope steps (1,000,000), static value/type expansion (100,000), alias/value depth
(24), and nested rule depth (32). Queries return pages of 1–500 items with an exact
total; counting still scans the selected bucket, bounded by workspace budgets.
Static module expressions have a 100,000-node parse budget and depth 32.
Module queries have a 20,000-step budget and depth 64, with cycle detection;
exhausted branches remain opaque. Effective token queries use a 256-entry cache
invalidated by every source/configuration change. Module mappings allow 16 roots,
128 patterns per root and 8 candidate targets per pattern.
Local symbol lookups use a document bucket. Innermost-node lookup uses a cached
interval tree. References inspect the declaring module and direct importers;
dependency impact walks the bounded transitive reverse graph. Full snapshots are
explicit whole-project operations, not the hover/completion path.

`proposeValueEdit` accepts a literal value inside an explicit URI/owner/path scope
and expected document version. It replaces only that value's source span. Object
literals remain directly editable after reparsing, including a computed
`["__proto__"]` data property. Accessors, sparse arrays, executable expressions,
nonfinite numbers and excessive value/depth/character counts are rejected.
`applyDesignEdit` rechecks source revision, version, source-node identity and span,
the replacement's literal shape, and resulting syntax. It returns text; the bridge
or editor owns the separately authorized file write and application validation.

The language server refreshes diagnostics for open dependents when token modules
change in an editor or on disk, including deletion and failed reads. Completion of
initial workspace indexing refreshes all open documents so results published before
imported definitions arrived do not remain stale. Refreshes coalesce by open URI,
with at most 4,096 queued documents and 16 publications per event-loop batch.
An unsaved editor document always takes precedence over disk indexing and watchers;
rejected over-budget buffers keep their error until a valid editor snapshot arrives.

When workspace roots are configured, editor open/change notifications obey the same
source inclusion policy as disk scanning and watchers. Files outside those roots,
outside `toned.include`, or in generated/dependency/test directories are ignored
without consuming open-buffer or index budgets. Rootless embedded servers retain
explicit-document operation for hosts that supply their own source boundary.

Initialization normalizes `.` segments in `toned.include` (`./src` becomes `src`)
and removes duplicate scopes before disk and editor matching. Traversal segments
(`..`) remain invalid.
