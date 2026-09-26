import { defineSystem, defineToken, type Variants } from '@toned/core'
import { createNativeRenderer } from '@toned/core/server'
import { createScenarios, verifyContracts } from './index.ts'

const ui = defineSystem({
  id: 'contract-types',
  tokens: {
    opacity: defineToken({
      values: [0, 1],
      resolve: (opacity) => ({ opacity }),
    }),
  },
})
const sheet = ui
  .stylesheet({ Root: { opacity: 1 } })
  .variants(($: Variants<{ size: 's' | 'm' }>) => ({
    [$.size('s')]: { Root: { opacity: 0 } },
  }))
const renderer = createNativeRenderer(ui, { tokens: {} })
const suite = createScenarios({ variants: { size: ['s', 'm'] } })
void verifyContracts({
  suite,
  resolve: (scenario) =>
    renderer.explain(sheet, { variants: scenario.variants }),
  contracts: [
    {
      id: 'target',
      kind: 'interaction-size',
      part: 'Root',
      minWidth: 44,
      minHeight: 44,
    },
  ],
})
void verifyContracts({
  suite,
  resolve: (scenario) =>
    renderer.explain(sheet, { variants: scenario.variants }),
  contracts: [
    // @ts-expect-error policies target real rendered part names
    { id: 'bad', kind: 'contrast', part: 'Missing', minRatio: 7 },
  ],
})
const focused = createScenarios({
  variants: { size: ['s'] },
  facts: { 'Root:focus-visible': [false, true] },
})
void verifyContracts({
  suite: focused,
  resolve: (scenario) =>
    renderer.explain(sheet, { variants: scenario.variants }),
  contracts: [
    {
      id: 'focus',
      kind: 'focus',
      part: 'Root',
      when: { fact: 'Root:focus-visible', equals: true },
    },
    {
      id: 'bad-fact',
      kind: 'focus',
      part: 'Root',
      // @ts-expect-error conditional policies must name a declared scenario fact
      when: { fact: 'Root:focused', equals: true },
    },
    {
      id: 'bad-value',
      kind: 'focus',
      part: 'Root',
      // @ts-expect-error expected values follow the finite fact axis
      when: { fact: 'Root:focus-visible', equals: 'yes' },
    },
  ],
})
