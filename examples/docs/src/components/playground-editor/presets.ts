// Presets are real project files, so `tsc` checks them against Toned's types;
// the playground loads their text and compiles it in the browser.
import buttonApp from './presets/button/App.tsx?raw'
import buttonStyles from './presets/button/styles.ts?raw'
import cardApp from './presets/card/App.tsx?raw'
import cardStyles from './presets/card/styles.ts?raw'
import responsiveApp from './presets/responsive/App.tsx?raw'
import responsiveStyles from './presets/responsive/styles.ts?raw'
import themeApp from './presets/theme/App.tsx?raw'
import themeStyles from './presets/theme/styles.ts?raw'
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
    files: { 'styles.ts': buttonStyles, 'App.tsx': buttonApp },
  },
  {
    id: 'card',
    label: 'Card with parts',
    summary: 'One stylesheet styling Root, Header, Body and Footer together.',
    files: { 'styles.ts': cardStyles, 'App.tsx': cardApp },
  },
  {
    id: 'theme',
    label: 'Custom system & theme',
    summary: 'Your own tokens with defineSystem and defineToken, plus themes.',
    files: { 'styles.ts': themeStyles, 'App.tsx': themeApp },
  },
  {
    id: 'responsive',
    label: 'Responsive & states',
    summary: 'A container query and real :hover / :focus-visible CSS.',
    files: { 'styles.ts': responsiveStyles, 'App.tsx': responsiveApp },
  },
]

export const defaultPreset = presets[0] as Preset

export function findPreset(id: string) {
  return presets.find((preset) => preset.id === id)
}
