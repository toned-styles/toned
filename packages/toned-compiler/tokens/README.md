# DTCG token interchange

This optional tool implements an explicit subset of the
[DTCG 2025.10 Format module](https://www.designtokens.org/tr/2025.10/format/)
and [Resolver module](https://www.w3.org/community/reports/design-tokens/CG-FINAL-resolver-20251028/).
It is not a full DTCG conformance implementation.

`importDtcg(document)` snapshots JSON and resolves numbers, px/rem dimensions,
ms/s durations, font families/weights, cubic Bézier values and numeric sRGB colors.
Groups inherit `$type`; `$root` tokens and chained whole-token `{path}` aliases
are supported. `exportDtcg(library)` preserves the original object structure,
alias spelling, descriptions, groups and extensions instead of flattening values.
JSON property order/whitespace and original serialized bytes are not a guarantee.

Unsupported types (including composite shadow/border/typography), group `$extends`,
JSON Pointer/property references, non-sRGB or `none` color components, and unknown
reserved properties remain preserved but produce diagnostics. Invalid values,
missing/circular aliases and incompatible alias types also produce diagnostics.
No unsupported token is silently converted to another type. The input boundary
rejects executable/non-JSON data, accessors, cycles and excessive structure.

```ts
const library = importDtcg({
  space: {
    $type: 'dimension',
    small: { $value: { value: 4, unit: 'px' } },
    button: { $value: '{space.small}', $description: 'Compact padding' },
  },
})
const values = mapDtcgTokens(library, token => [token.path.join('.'), token.value])
const retainedDocument = exportDtcg(library)
```

`mapDtcgTokens` is the explicit bridge to application theme data. Its callback
receives validated resolved DTCG values and chooses names/unit/color conversions
for the application's Toned token resolvers. Toned resolvers can accept arbitrary
schemas, so interchange cannot infer this mapping. Diagnostics block mapping;
duplicate target names fail instead of overwriting an earlier token.

`resolveDtcgContext(resolver, { context, sources })` resolves one selected context.
It supports ordered named local sets/modifiers, modifier defaults, whole external
source documents supplied in memory, and inline sets with required name/type.
Later sources replace earlier tokens, and aliases resolve after all layers merge.
It never fetches URLs/files or enumerates context combinations. The result retains
the resolver document, selected context, token library and combined diagnostics;
a partial context with missing sources cannot be mapped as a valid library.

Inline modifiers, arbitrary/partial JSON Pointer resolver references, reference
sibling overrides and `$defs` indirection are outside this resolver subset. Unsupported
entries produce diagnostics; their semantics are not approximated. Use named
modifiers and explicit in-memory complete sources for the supported path.

JSON snapshots cap depth at 64, nodes at 100,000 and textual data at 2 million
characters. Alias/reference chains cap at 64, external sources at 128, expansion
steps at 10,000 and merged fields at 200,000. Exceeding a resource budget throws
before returning a misleading partial result. Source metadata may be exported
losslessly as JSON structure even when its runtime interpretation is unsupported.


Context overlays merge into private group accumulators. Existing accumulated
fields are not recopied for each source; the 200,000-field merge budget counts
each incoming group field, including newly inserted groups. Frozen source
snapshots and token/metadata payloads are never mutated.
