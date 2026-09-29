import type { Variants } from '@toned/core'
import { stylesheet } from './system.ts'

export const visualStyles = stylesheet({
  Root: {
    accent: 'blue',
    scheme: 'light',
    ink: 'default',
    flexLayout: 'column',
    gap: 8,
  },
  Map: {
    ink: 'accent',
    surface: 'soft',
    curve: 'round',
    padding: 4,
    width: '100%',
    '@md': { padding: 10 },
  },
  Diagram: {
    display: 'none',
    width: '100%',
    height: 'auto',
    '@md': { display: 'block' },
  },
  MobileDiagram: { width: '100%', height: 'auto', '@md': { display: 'none' } },
  Flow: {
    animation: 'token-flow',
    '@platform web': { $style: { strokeDasharray: '5 9' } },
  },
  Caption: { $kind: 'text', ink: 'accent', fontSize: '13px', fontWeight: 600 },
  Stage: {
    flexLayout: 'column',
    alignItems: 'center',
    gap: 5,
    padding: 4,
    curve: 'round',
    '@platform web': {
      $style: {
        backgroundColor: '#edf1ff',
        backgroundImage: 'radial-gradient(#b8c5ed 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      },
    },
    '@md': { padding: 10 },
  },
  Frame: { container: 'preview', width: '100%', maxWidth: '600px' },
  Card: {
    flexLayout: 'column',
    gap: 6,
    padding: 5,
    surface: 'card',
    curve: 'soft',
    '@container preview wide': {
      flexLayout: 'row',
      alignItems: 'center',
      padding: 8,
    },
  },
  Artwork: {
    surface: 'accent',
    ink: 'white',
    curve: 'soft',
    flexLayout: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '140px',
    '@container preview wide': {
      width: '160px',
      '@platform web': { $style: { flexShrink: 0 } },
    },
  },
  Copy: { flexLayout: 'column', gap: 2 },
  Title: {
    $kind: 'text',
    fontSize: '24px',
    fontWeight: 600,
    letterSpacing: '-0.04em',
    lineHeight: 1.2,
  },
  Text: { $kind: 'text', fontSize: '14px', ink: 'default', opacity: 0.75 },
  Indicator: {
    $kind: 'text',
    fontSize: '12px',
    ink: 'accent',
    fontWeight: 600,
  },
  Wide: { display: 'none', '@container preview wide': { display: 'block' } },
  Narrow: { display: 'block', '@container preview wide': { display: 'none' } },
}).variants(
  (
    $: Variants<{ tone: 'blue' | 'violet' | 'coral'; size: 'narrow' | 'wide' }>,
  ) => ({
    [$.tone('violet')]: { Root: { accent: 'violet' } },
    [$.tone('coral')]: { Root: { accent: 'coral' } },
    [$.size('narrow')]: { Frame: { maxWidth: '280px' } },
  }),
  { defaults: { tone: 'blue', size: 'wide' } },
)
