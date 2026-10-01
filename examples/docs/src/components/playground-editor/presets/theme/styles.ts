import { stylesheet, type Theme, type Variants } from './system.ts'

// The theme names come from the system, so a new palette is one change there.
export type ProfileVariants = { theme: Theme }

export const profileStyles = stylesheet({
  Root: { theme: 'daylight', surface: 'canvas', space: 6, radius: 'soft' },
  Card: {
    surface: 'card',
    ink: 'default',
    space: 4,
    stack: 2,
    radius: 'soft',
  },
  Eyebrow: { $kind: 'text', text: 'caption', ink: 'accent' },
  Name: { $kind: 'text', text: 'title' },
  Bio: { $kind: 'text', text: 'body' },
  Follow: {
    $kind: 'pressable',
    surface: 'accent',
    ink: 'inverse',
    radius: 'pill',
    space: 2,
    text: 'body',
  },
}).variants(
  ($: Variants<ProfileVariants>) => ({
    [$.theme('midnight')]: { Root: { theme: 'midnight' } },
    [$.theme('meadow')]: { Root: { theme: 'meadow' } },
  }),
  { defaults: { theme: 'daylight' } },
)
