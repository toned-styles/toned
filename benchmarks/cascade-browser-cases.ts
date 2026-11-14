/** Worker for cascade-browser.mjs: prints, as JSON, the system CSS and the
 * resolved root output of each case, with the computed styles Chromium must
 * produce with the state off and on. Run with Bun from the repository root. */
import { buildStyles } from '../packages/toned-core/build/index.ts'
import { createWebRenderer } from '../packages/toned-core/server/index.ts'
import {
  defineSystem,
  defineToken,
} from '../packages/toned-core/system/definers.ts'
import { serializeCssValue } from '../packages/toned-core/utils/css-value.ts'
import { camelToKebab } from '../packages/toned-core/utils/css.ts'

const gap = defineToken({ values: [1], resolve: (gap: number) => ({ gap }) })
const ui = defineSystem({
  id: 'cascade',
  tokens: { gap },
  conditions: { states: { open: "[data-state='open']" } },
})
const legacy = defineSystem(
  { gap },
  { states: { open: "[data-state='open']" } },
)

type Expect = Record<string, string>
type Case = {
  name: string
  legacy?: boolean
  rest: Record<string, unknown>
  open: Record<string, unknown>
  off: Expect
  on: Expect
}

const cases: Case[] = [
  {
    name: 'transition at rest, transitionProperty while open',
    rest: { transition: 'opacity 200ms ease' },
    open: { transitionProperty: 'transform' },
    off: {
      'transition-property': 'opacity',
      'transition-duration': '0.2s',
      'transition-timing-function': 'ease',
    },
    on: { 'transition-property': 'transform', 'transition-duration': '0.2s' },
  },
  {
    name: 'overflowY at rest, overflow while open',
    rest: { overflowY: 'auto' },
    open: { overflow: 'hidden' },
    // overflow-x rests at visible, which computes to auto beside a
    // non-visible overflow-y (CSS Overflow 3).
    off: { 'overflow-x': 'auto', 'overflow-y': 'auto' },
    on: { 'overflow-x': 'hidden', 'overflow-y': 'hidden' },
  },
  {
    name: 'outline at rest, outlineColor while open',
    rest: { outline: '2px solid rgb(255, 0, 0)' },
    open: { outlineColor: 'rgb(0, 0, 255)' },
    off: {
      'outline-width': '2px',
      'outline-style': 'solid',
      'outline-color': 'rgb(255, 0, 0)',
    },
    on: { 'outline-width': '2px', 'outline-color': 'rgb(0, 0, 255)' },
  },
  {
    name: 'border at rest, borderTopColor while open',
    rest: { border: '1px solid rgb(255, 0, 0)' },
    open: { borderTopColor: 'rgb(0, 0, 255)' },
    off: {
      'border-top-color': 'rgb(255, 0, 0)',
      'border-left-width': '1px',
      'border-bottom-style': 'solid',
    },
    on: {
      'border-top-color': 'rgb(0, 0, 255)',
      'border-right-color': 'rgb(255, 0, 0)',
      'border-top-width': '1px',
    },
  },
  {
    name: 'background at rest, backgroundColor while open',
    rest: { background: 'rgb(255, 255, 255)' },
    open: { backgroundColor: 'rgb(0, 0, 0)' },
    off: { 'background-color': 'rgb(255, 255, 255)' },
    on: { 'background-color': 'rgb(0, 0, 0)', 'background-image': 'none' },
  },
  {
    name: 'borderRadius at rest, borderTopLeftRadius while open',
    rest: { borderRadius: '4px 8px' },
    open: { borderTopLeftRadius: '0px' },
    off: {
      'border-top-left-radius': '4px',
      'border-top-right-radius': '8px',
    },
    on: { 'border-top-left-radius': '0px', 'border-top-right-radius': '8px' },
  },
  {
    name: 'flex at rest, flexBasis while open',
    rest: { flex: '1' },
    open: { flexBasis: 'auto' },
    off: { 'flex-grow': '1', 'flex-shrink': '1', 'flex-basis': '0%' },
    on: { 'flex-grow': '1', 'flex-basis': 'auto' },
  },
  {
    name: 'a legacy padding at rest, paddingTop while open',
    legacy: true,
    rest: { padding: '4px 8px' },
    open: { paddingTop: 0 },
    off: { 'padding-top': '4px', 'padding-left': '8px' },
    on: { 'padding-top': '0px', 'padding-left': '8px' },
  },
  {
    name: 'a static pair that cannot be split stays as authored',
    rest: { animation: 'spin 1s', animationPlayState: 'paused' },
    open: {},
    off: { 'animation-play-state': 'paused', 'animation-duration': '1s' },
    on: { 'animation-play-state': 'paused' },
  },
]

const inline = (style: Record<string, unknown>) =>
  Object.entries(style)
    .map(
      ([field, value]) =>
        `${field.startsWith('--') ? field : camelToKebab(field)}:${serializeCssValue(field, value)}`,
    )
    .join(';')

const output = {
  css:
    buildStyles(ui, { sheets: [] }).css +
    buildStyles(legacy, { sheets: [] }).css,
  cases: cases.map((entry) => {
    const system = entry.legacy ? legacy : ui
    const sheet = system.stylesheet(
      (entry.legacy
        ? { Root: { style: entry.rest, ':open': { style: entry.open } } }
        : {
            Root: {
              '@platform web': { $style: entry.rest },
              ':open': { '@platform web': { $style: entry.open } },
            },
          }) as never,
    )
    const root = (
      createWebRenderer(system as never, {
        manifest: buildStyles(system, { sheets: [] }).manifest,
      }).resolve(sheet) as Record<
        string,
        { className?: string; style?: Record<string, unknown> }
      >
    )['Root']!
    return {
      name: entry.name,
      className: root.className ?? '',
      style: inline(root.style ?? {}),
      off: entry.off,
      on: entry.on,
    }
  }),
}
process.stdout.write(JSON.stringify(output))
