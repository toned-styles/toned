// Stand-in features for the matrix builder's own test.
import type { Variants } from '../../../index.ts'
import { ui } from '../../fixture/system.ts'

export const features = {
  ok: {
    description: 'accepted everywhere',
    sheet: () => ({ name: 'ok' as const }),
  },
  bad: {
    description: 'refused by two targets',
    sheet: () => ({ name: 'bad' as const }),
  },
  toned: {
    description: 'a stylesheet whose loud tone one target refuses',
    sheet: () =>
      ui
        .stylesheet({ Root: { padding: 1 } })
        .variants(($: Variants<{ tone: 'quiet' | 'loud' }>) => ({
          [$.tone('quiet')]: { Root: { padding: 2 } },
          [$.tone('loud')]: { Root: { padding: 4 } },
        })),
    options: { variants: { tone: 'quiet' } } as const,
  },
}
