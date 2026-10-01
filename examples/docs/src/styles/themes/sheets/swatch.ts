import { stylesheet } from '../system.ts'

/** A miniature of a theme: its stage, a surface with text, and its accent. */
export const swatchStyles = stylesheet({
  Root: {
    flow: 'inline',
    align: 'center',
    gap: 1,
    pad: 1,
    fill: 'stage',
    corner: 'control',
    overflow: 'clip',
  },
  Sample: {
    $kind: 'text',
    flow: 'inline',
    align: 'center',
    justify: 'center',
    size: 'avatar',
    type: 'title',
    fill: 'raised',
    ink: 'strong',
    edge: 'panel',
    corner: 'control',
  },
  Accent: { size: 'swatch', fill: 'accent', corner: 'pill' },
})
