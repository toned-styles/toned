import { defineGrid, fr } from '../../grid/index.ts'
/**
 * One fixture sheet per feature, each written the canonical way, for the
 * target conformance matrix. Add a feature by adding an entry.
 */
import type { Variants } from '../../index.ts'
import { webRules } from '../../web/rules.ts'
import { ui } from '../fixture/system.ts'

const message = defineGrid('scorecard-message', {
  columns: [fr(1), fr(2)],
  areas: [['avatar', 'body']],
})

export const features = {
  tokens: {
    description: 'finite token values',
    sheet: () =>
      ui.stylesheet({ Root: { gap: 1, padding: 2, bgColor: 'accent' } }),
  },
  variants: {
    description: 'a typed variant axis',
    sheet: () =>
      ui
        .stylesheet({ Root: { padding: 1 } })
        .variants(($: Variants<{ size: 's' | 'm' }>) => ({
          [$.size('m')]: { Root: { padding: 4 } },
        })),
    options: { variants: { size: 'm' } } as const,
  },
  media: {
    description: 'a declared media condition',
    sheet: () =>
      ui.stylesheet((q) => ({ Root: { gap: 1, [q.media('md')]: { gap: 2 } } })),
  },
  'compound-condition': {
    description: 'condition algebra over declared conditions',
    sheet: () =>
      ui.stylesheet((q) => ({
        Root: { gap: 1, [q.not(q.media('md'))]: { gap: 2 } },
      })),
  },
  state: {
    description: 'a declared state',
    sheet: () =>
      ui.stylesheet((q) => ({
        Root: { gap: 1, [q.state('open')]: { gap: 2 } },
      })),
  },
  hover: {
    description: 'the built-in hover state',
    sheet: () =>
      ui.stylesheet({ Root: { opacity: 1, ':hover': { opacity: 0.5 } } }),
  },
  'source-channel': {
    description: "a cross-part key (`'Root:hover'`)",
    sheet: () =>
      ui.stylesheet({
        Root: { gap: 1 },
        Item: { padding: 1 },
        'Root:hover': { Item: { padding: 2 } },
      }),
  },
  bridge: {
    description: 'a bridge token (placeholder colour)',
    sheet: () => ui.stylesheet({ Root: { placeholderColor: 'muted' } }),
  },
  'context-provider': {
    description:
      "a context marker on a provider part (`$context: 'prose=faq'`)",
    sheet: () => ui.stylesheet({ Root: { $context: 'prose=faq', gap: 1 } }),
  },
  'context-value': {
    description:
      "a part keyed on an ancestor's context value (`'@within prose=faq'`)",
    sheet: () =>
      ui.stylesheet({ Root: { gap: 1, '@within prose=faq': { gap: 2 } } }),
  },
  'context-state': {
    description: "a part keyed on an ancestor's state (`'@within card:hover'`)",
    sheet: () =>
      ui.stylesheet({
        Root: { opacity: 1, '@within card:hover': { opacity: 0.5 } },
      }),
  },
  grid: {
    description: 'a typed web grid in a web block',
    // Typed `object`: grid brands are unexported symbols, so an exported
    // inferred sheet using a grid cannot be named in declarations (TS4023).
    sheet: (): object =>
      ui.stylesheet({
        Root: { '@platform web': { $grid: message } },
        Avatar: { '@platform web': { $area: message.area('avatar') } },
        Body: { '@platform web': { $area: message.area('body') } },
      }),
  },
  animation: {
    description: 'a declared animation',
    sheet: () => ui.stylesheet({ Root: { animation: 'fade-in' } }),
  },
  'platform-blocks': {
    description: 'web and native platform blocks',
    sheet: () =>
      ui.stylesheet({
        Root: {
          '@platform web': { $style: { cursor: 'pointer' } },
          '@platform native': { $style: { opacity: 0.9 } },
        },
      }),
  },
  'css-variable': {
    description: 'a declared external CSS variable (`--app-surface`)',
    sheet: () => ui.stylesheet({ Root: { bgColor: 'surface' } }),
  },
  'web-rules': {
    description: 'a `$webRules` CSS extension in a web block',
    sheet: () =>
      ui.stylesheet({
        Root: {
          '@platform web': {
            $webRules: webRules({ '&::before': { content: '"*"' } }),
          },
        },
      }),
  },
}
