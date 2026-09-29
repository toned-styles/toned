import type { Variants } from '@toned/core'
import { stylesheet } from './system.ts'

export const showcaseStyles = stylesheet({
  Root: {
    accent: 'blue',
    scheme: 'light',
    surface: 'soft',
    ink: 'default',
    curve: 'round',
    flexLayout: 'column',
    gap: 6,
    width: '100%',
    padding: 6,
    '@md': { padding: 10 },
  },
  Card: {
    surface: 'card',
    curve: 'round',
    flexLayout: 'column',
    gap: 6,
    padding: 6,
    width: '100%',
    '@platform web': { $style: { boxShadow: '0 24px 64px #18255418' } },
  },
  Heading: {
    $kind: 'text',
    fontSize: '28px',
    fontWeight: 600,
    letterSpacing: '-0.04em',
    lineHeight: 1.15,
  },
  Row: {
    flexLayout: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
  },
  Stack: { flexLayout: 'column', gap: 1 },
  Caption: { $kind: 'text', fontSize: '13px', opacity: 0.72 },
  Badge: {
    $kind: 'text',
    surface: 'soft',
    ink: 'accent',
    curve: 'pill',
    paddingX: 3,
    paddingY: 1,
    fontSize: '12px',
    fontWeight: 600,
  },
  Icon: {
    surface: 'accent',
    ink: 'white',
    curve: 'soft',
    flexLayout: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
  },
  Progress: {
    surface: 'track',
    curve: 'pill',
    height: '8px',
    overflow: 'hidden',
  },
  Fill: { surface: 'accent', curve: 'pill', width: '72%', height: '100%' },
  Button: {
    $kind: 'pressable',
    surface: 'accent',
    ink: 'white',
    curve: 'soft',
    paddingY: 3,
    paddingX: 5,
    fontWeight: 600,
    fontSize: '14px',
    ':hover': { opacity: 0.85 },
  },
}).variants(
  (
    $: Variants<{
      tone: 'blue' | 'violet' | 'coral'
      shape: 'rounded' | 'sharp'
      density: 'comfortable' | 'compact'
      theme: 'light' | 'dark'
    }>,
  ) => ({
    [$.tone('violet')]: { Root: { accent: 'violet' } },
    [$.tone('coral')]: { Root: { accent: 'coral' } },
    [$.shape('sharp')]: {
      Card: { curve: 'sharp' },
      Icon: { curve: 'sharp' },
      Button: { curve: 'sharp' },
    },
    [$.density('compact')]: {
      Card: { gap: 3, padding: 4 },
      Button: { paddingY: 2 },
    },
    [$.theme('dark')]: { Root: { scheme: 'dark' } },
  }),
  {
    defaults: {
      tone: 'blue',
      shape: 'rounded',
      density: 'comfortable',
      theme: 'light',
    },
  },
)
