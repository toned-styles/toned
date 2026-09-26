# Executable design contracts

`createScenarios` enumerates explicit finite variant, fact, theme, text and viewport
inputs. Variant literal types survive enumeration, so `scenario.variants` can be
passed directly to the matching typed renderer. The default limit is 256 scenarios.
Exceeding a limit fails unless `mode: 'sampled'` is explicit; sampling selects evenly
spaced Cartesian indices, including the endpoints when the budget exceeds one.
It is neither random nor pairwise coverage. Reports retain exact total cardinality
as a decimal string, selected count and dimension cardinalities. Empty axes and
duplicated values are errors. Omitted dimensions contribute no variation.

`verifyContracts` resolves each selected scenario once through the application's
renderer and requests real measurements from its host adapter. Policies infer
valid part names from `renderer.explain` output. Findings contain the scenario,
observations, policy id and declaration origins from the same explanation.

```ts
const suite = createScenarios({
  variants: { size: ['s', 'm'] },
  facts: { 'Root:focus-visible': [false, true] },
  themes: ['light', 'dark'],
  texts: ['Save', 'Save all changes to this document'],
  viewports: [{ width: 320, height: 640 }, { width: 1200, height: 800 }],
})
const report = await verifyContracts({
  suite,
  resolve: scenario => renderer.explain(button, {
    variants: scenario.variants,
    facts: scenario.facts,
    tokens: themes[scenario.theme!],
  }),
  // Apply text, viewport, theme and facts to the mounted specimen, settle layout,
  // and return observations in logical pixels. This adapter owns its browser/device.
  measure: (scenario, resolution) => measureButton(scenario, resolution),
  contracts: [
    { id: 'target', kind: 'interaction-size', part: 'Root', minWidth: 44, minHeight: 44 },
    { id: 'text', kind: 'contrast', part: 'Label', backgroundPart: 'Root', minRatio: 4.5 },
    { id: 'overflow', kind: 'overflow', part: 'Label', axis: 'x' },
    { id: 'focus', kind: 'focus', part: 'Root', when: { fact: 'Root:focus-visible', equals: true } },
  ],
})
```

Interaction size and overflow require measured geometry. Focus requires an
observed visible indicator. Reduced-motion policies require an explicit fact and
observed duration; a declared transition alone is insufficient. Missing condition
facts are inconclusive; explicit nonmatching facts skip that conditional policy.
The adapter must actually apply every scenario input before measuring it: the
verifier cannot establish that a callback's observations are truthful.

Contrast accepts only adapter-composited opaque sRGB `#rgb`/`#rrggbb` colors and
computes the relative-luminance ratio. It does not infer backgrounds, composite
alpha, resolve CSS variables, convert wide-gamut colors, or assert WCAG conformance.
Unsupported or missing colors are inconclusive. The standalone `contrastRatio`
can also inspect explicit color pairs without invoking a host.

A report passes only its executed observations. Sampled success never establishes
unvisited scenarios. Findings default to 100 retained examples; aggregate failure
counts remain exact after truncation. Verification permits at most 10,000
scenarios, 1,000 policies and 100,000 checks. Enumeration limits each of at most
64 axes to 10,000 values and never allocates the Cartesian product before sampling.
Callbacks run sequentially and accept caller cancellation through the verifier's
`signal`; their own I/O/time budgets remain the adapter's responsibility. Runtime
resolution/measurement errors produce inconclusive findings, never a success.
