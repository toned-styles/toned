import { type Variants, webRules } from '@toned/core'
import { stylesheet } from '../system.ts'

/** The frame of the interface: stage, window, bars, sidebar and main column. */
export const shellStyles = stylesheet({
  Stage: {
    flow: 'column',
    align: 'center',
    pad: 3,
    fill: 'stage',
    ink: 'default',
    type: 'body',
    icons: 'themed',
    native: 'selection',
    '@media md': { pad: 8 },
    '@platform web': {
      // No theme may animate for a reader who asked for reduced motion. This
      // is a browser media feature, so it has no portable token.
      $webRules: webRules(
        {},
        {
          media: {
            '(prefers-reduced-motion: reduce)': webRules({
              '& *': { transitionDuration: '0s !important' },
            }),
          },
        },
      ),
    },
  },
  Window: {
    measure: 'window',
    flow: 'column',
    place: 'origin',
    fill: 'surface',
    edge: 'panel',
    corner: 'window',
    depth: 'window',
    frost: 'surface',
    overflow: 'clip',
  },
  // Drawn by themes that have window chrome; `display: none` in the rest.
  TitleBar: {
    chrome: 'title-bar',
    justify: 'between',
    padX: 2,
    fill: 'selected',
    ink: 'on-selected',
  },
  StatusBar: {
    chrome: 'status-bar',
    gap: 4,
    padX: 2,
    fill: 'bar',
    ink: 'on-bar',
    overflow: 'truncate',
  },
  Key: { $kind: 'text', ink: 'danger' },
  AppBar: {
    flow: 'wrap',
    align: 'center',
    gap: 2,
    padX: 3,
    padY: 2,
    fill: 'bar',
    ink: 'on-bar',
    edge: 'bar',
    // A theme may float the bar inside the window instead of ruling it off.
    inset: 'app-bar',
    corner: 'app-bar',
    depth: 'app-bar',
    place: 'origin',
    '@media md': { gap: 4, padX: 4 },
  },
  Brand: { flow: 'row', align: 'center', gap: 2, padX: 1 },
  BrandMark: { size: 'swatch', fill: 'accent', corner: 'control' },
  BrandName: { $kind: 'text', type: 'title' },
  Nav: { flow: 'row', gap: 1, flex: 'fill', overflow: 'scroll-x' },
  Body: { flow: 'column', '@media md': { flow: 'row' } },
  Sidebar: {
    flow: 'column',
    gap: 2,
    pad: 3,
    edge: 'rule',
    '@media md': { measure: 'sidebar', edge: 'side', padY: 4 },
  },
  SideLabel: { $kind: 'text', type: 'label', ink: 'muted', padX: 2 },
  SideList: {
    reset: 'list',
    flow: 'row',
    gap: 1,
    pad: 0,
    overflow: 'scroll-x',
    '@media md': { flow: 'column' },
  },
  Main: {
    flex: 'fill',
    flow: 'column',
    gap: 4,
    pad: 3,
    place: 'origin',
    '@media md': { pad: 5, gap: 5 },
  },
  PageHead: { flow: 'wrap', align: 'center', justify: 'between', gap: 3 },
  // A text-mode theme puts its cursor after the title.
  PageTitle: {
    $kind: 'text',
    type: 'display',
    ink: 'strong',
    affix: 'cursor',
  },
  PageNote: { $kind: 'text', type: 'small', ink: 'muted' },
  Group: { flow: 'wrap', align: 'center', gap: 3 },
  // Shown where there is room for it.
  Wide: { flow: 'hidden', '@media md': { flow: 'row' } },
  Stack: { flow: 'column', gap: 1 },
  Options: { flow: 'column', align: 'start', gap: 3 },
  Stats: { tracks: 'stats', gap: 3 },
})

/** A link in the app bar. */
export const navStyles = stylesheet({
  Link: {
    $kind: 'pressable',
    reset: 'control',
    flow: 'inline',
    align: 'center',
    padX: 2,
    padY: 1,
    type: 'control',
    fill: 'none',
    ink: 'on-bar',
    edge: 'none',
    corner: 'control',
    motion: 'themed',
    ':hover': { fill: 'selected', ink: 'on-selected' },
    ':focus-visible': { focus: 'ring' },
  },
}).variants(($: Variants<{ current: boolean }>) => ({
  [$.current(true)]: {
    Link: { fill: 'selected', ink: 'on-selected', depth: 'selected' },
  },
}))

/** One project in the sidebar. */
export const sideItemStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    reset: 'control',
    flow: 'row',
    align: 'center',
    justify: 'between',
    gap: 3,
    flex: 'full',
    padX: 2,
    padY: 1.5,
    overflow: 'nowrap',
    textAlign: 'left',
    type: 'body',
    fill: 'none',
    ink: 'default',
    edge: 'none',
    corner: 'control',
    motion: 'themed',
    ':hover': { fill: 'hover' },
    ':focus-visible': { focus: 'ring' },
  },
  // The theme may put a marker before the name of the selected project.
  Name: { $kind: 'text', flex: 'fill' },
  Count: { $kind: 'text', type: 'data', ink: 'muted' },
}).variants(($: Variants<{ selected: boolean }>) => ({
  [$.selected(true)]: {
    Root: {
      fill: 'selected',
      ink: 'on-selected',
      weight: 'strong',
      depth: 'selected',
      ':hover': { fill: 'selected' },
    },
    Name: { affix: 'bullet' },
    Count: { ink: 'on-selected' },
  },
}))
