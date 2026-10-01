import { createScenarios, verifyContracts } from '@toned/compiler/contracts'
import { inline } from './document.renderers.ts'
import { documentSheet } from './document.styles.ts'

const suite = createScenarios({ variants: { compact: [false] } })

type Size = { width: number; height: number }

/** Check one measured `Root` against a 44 × 44 interaction-size contract. */
export function verifyTouchTarget(measure: () => Size | undefined) {
  return verifyContracts({
    suite,
    contracts: [
      {
        id: 'touch-target',
        kind: 'interaction-size',
        part: 'Root',
        minWidth: 44,
        minHeight: 44,
      },
    ],
    resolve: (scenario) =>
      inline.explain(documentSheet, { variants: scenario.variants }),
    measure: () => {
      const size = measure()
      return size ? { Root: { width: size.width, height: size.height } } : {}
    },
  })
}
