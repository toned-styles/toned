/**
 * The build-purity suite over the fixture system: base sheets, the mutations
 * an author makes every day, and the build under test: `buildStyles` with the
 * sheets still passed, as consumers written before the build stopped reading
 * them do. Every supported-API mutation must leave the outputs unchanged; the
 * deprecated `$webRules` extension, which generates CSS from sheet content,
 * is measured and reported apart.
 */
import { buildStyles } from '../../build/index.ts'
import { dp } from '../../core/values.ts'
import type { StylesheetInstance } from '../../types/index.ts'
import { webRules } from '../../web/rules.ts'
import { ui } from '../fixture/system.ts'
import {
  type BuildOutput,
  type Mutation,
  measurePurity,
  type SheetSet,
} from './purity.ts'

const card = () =>
  ui.stylesheet((q) => ({
    Root: { padding: 2, bgColor: 'surface', [q.state('open')]: { padding: 4 } },
    Title: { $kind: 'text', textColor: 'accent' },
  }))
const button = () =>
  ui.stylesheet((q) => ({
    Root: { gap: 1, ':hover': { opacity: 0.5 }, [q.media('md')]: { gap: 2 } },
  }))

export const baseSheets: SheetSet = { card, button }

const add = (name: string, make: () => unknown) => (sheets: SheetSet) => ({
  ...sheets,
  [name]: make,
})

export const mutations: readonly Mutation[] = [
  {
    id: 'add-token-sheet',
    description:
      'add a sheet using tokens, a declared state and declared media',
    apply: add('badge', () =>
      ui.stylesheet((q) => ({
        Root: { gap: 0, [q.state('open')]: { gap: 4 }, '@md': { padding: 1 } },
      })),
    ),
  },
  {
    id: 'edit-token-value',
    description: 'edit a token value in an existing sheet',
    apply: (sheets) => ({
      ...sheets,
      card: () =>
        ui.stylesheet({ Root: { padding: 4 }, Title: { $kind: 'text' } }),
    }),
  },
  {
    id: 'delete-sheet',
    description: 'delete a sheet',
    apply: (sheets) =>
      Object.fromEntries(
        Object.entries(sheets).filter(([name]) => name !== 'button'),
      ),
  },
  {
    id: 'add-compound-condition',
    description: 'add a sheet with a compound of declared conditions',
    apply: add('compound', () =>
      ui.stylesheet((q) => ({
        Root: { [q.all(q.media('md'), q.state('open'))]: { gap: 2 } },
      })),
    ),
  },
  {
    id: 'add-local-media',
    description:
      'add a sheet with a declared width at the use site (`q.media(dp(600))`)',
    apply: add('local', () =>
      ui.stylesheet((q) => ({ Root: { [q.media(dp(600))]: { gap: 2 } } })),
    ),
  },
  {
    id: 'add-container-width',
    description:
      "add a sheet with a declared container width (`q.container('card', dp(300))`)",
    apply: add('tile', () =>
      ui.stylesheet((q) => ({
        Root: { [q.container('card', dp(300))]: { padding: 4 } },
      })),
    ),
  },
  {
    id: 'add-source-channel',
    description: "add a sheet with a source-channel key (`'Root:hover'`)",
    apply: add('row', () =>
      ui.stylesheet({
        Root: { gap: 1 },
        Cell: { padding: 1 },
        'Root:hover': { Cell: { padding: 2 } },
      }),
    ),
  },
  {
    id: 'add-web-rules',
    description: 'add a sheet with a `$webRules` CSS extension',
    deprecated: '$webRules',
    apply: add('marked', () =>
      ui.stylesheet({
        Root: {
          '@platform web': {
            $webRules: webRules({ '&::before': { content: '"*"' } }),
          },
        },
      }),
    ),
  },
  {
    id: 'add-derived-sheet',
    description:
      'derive a sheet with `extend` that adds a declared width (`dp(900)`)',
    apply: add('compact', () =>
      (button() as ReturnType<typeof button>).extend((q) => ({
        Root: { [q.media(dp(900))]: { gap: 4 } },
      })),
    ),
  },
]

/** `buildStyles` with the sheets collected, the deprecated call shape: the
 *  strictest test, since the build is given every sheet and must ignore it. */
export const buildWithSheets = (sheets: SheetSet): BuildOutput => {
  const { css, manifest } = buildStyles(ui, {
    sheets: Object.values(sheets).map((make) => make() as StylesheetInstance),
  })
  return { css, manifest }
}

export const runPuritySuite = () =>
  measurePurity(buildWithSheets, baseSheets, mutations)
