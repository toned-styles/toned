# Source index and edits

`DesignProject` owns immutable serializable documents, source ranges, symbols and
relative-import dependency edges. It does not retain TypeScript syntax trees or
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
returns and other statements stay opaque. Spreads, shorthand, methods and dynamic
computed keys are not executed or guessed. Syntax errors and exhausted static
expansion budgets appear as diagnostics. Model values describe source declarations;
they do not certify runtime behavior or prove that another statement never mutates
a referenced object. Renderer and TypeScript checks remain necessary.

Definitions and references follow indexed relative named imports and module-level
bindings. Package/tsconfig aliases, namespace member resolution, re-export barrels,
default-export indirection and generated/dynamic imports need the owning TypeScript
language service or runtime evidence. Part names and token field names are not
lexical JavaScript bindings: spelling matches are not reported as references.
This finite index complements TypeScript semantic checking; it does not replace it.

Default project budgets are 4,096 files, 32 million UTF-16 characters total,
1 million characters per document, and 20,000 design nodes per document. Budget
violations fail visibly and preserve the previous document. Each parse also bounds
syntax visits (200,000), lexical scope steps (1,000,000), static value/type expansion (100,000), alias/value depth
(24), and nested rule depth (32). Queries return pages of 1–500 items with an exact
total; counting still scans the selected bucket, bounded by workspace budgets.
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
