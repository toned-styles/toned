// Presets are real project files, so `tsc` checks them against Toned's types;
// the playground loads their text and compiles it in the browser. Every
// preset keeps its three layers apart: `system.ts` (configuration),
// `styles.ts` (style declarations) and `App.tsx` (the component).
import buttonApp from './presets/button/App.tsx?raw'
import buttonStyles from './presets/button/styles.ts?raw'
import buttonSystem from './presets/button/system.ts?raw'
import cardApp from './presets/card/App.tsx?raw'
import cardStyles from './presets/card/styles.ts?raw'
import cardSystem from './presets/card/system.ts?raw'
import elementsApp from './presets/elements/App.tsx?raw'
import elementsStyles from './presets/elements/styles.ts?raw'
import elementsSystem from './presets/elements/system.ts?raw'
import responsiveApp from './presets/responsive/App.tsx?raw'
import responsiveStyles from './presets/responsive/styles.ts?raw'
import responsiveSystem from './presets/responsive/system.ts?raw'
import themeApp from './presets/theme/App.tsx?raw'
import themeStyles from './presets/theme/styles.ts?raw'
import themeSystem from './presets/theme/system.ts?raw'
import type { SourceFiles } from './types.ts'

export type Preset = {
  id: string
  label: string
  summary: string
  files: SourceFiles
}

export const presets: readonly Preset[] = [
  {
    id: 'button',
    label: 'Button variants',
    summary: 'Size, tone and disabled variants on the base token vocabulary.',
    files: {
      'styles.ts': buttonStyles,
      'App.tsx': buttonApp,
      'system.ts': buttonSystem,
    },
  },
  {
    id: 'card',
    label: 'Card with parts',
    summary: 'One stylesheet styling Root, Header, Body and Footer together.',
    files: {
      'styles.ts': cardStyles,
      'App.tsx': cardApp,
      'system.ts': cardSystem,
    },
  },
  {
    id: 'elements',
    label: 'createElements family',
    summary:
      'Stable part components that read variants and shared state from their family.',
    files: {
      'styles.ts': elementsStyles,
      'App.tsx': elementsApp,
      'system.ts': elementsSystem,
    },
  },
  {
    id: 'theme',
    label: 'Custom system & theme',
    summary:
      'A system of your own in system.ts: tokens from defineSystem and defineToken, plus themes.',
    files: {
      'styles.ts': themeStyles,
      'App.tsx': themeApp,
      'system.ts': themeSystem,
    },
  },
  {
    id: 'responsive',
    label: 'Responsive & states',
    summary:
      'A container declared in system.ts, queried by the stylesheet, with real :hover and :focus-visible CSS.',
    files: {
      'styles.ts': responsiveStyles,
      'App.tsx': responsiveApp,
      'system.ts': responsiveSystem,
    },
  },
]

export const defaultPreset = presets[0] as Preset

export function findPreset(id: string) {
  return presets.find((preset) => preset.id === id)
}
