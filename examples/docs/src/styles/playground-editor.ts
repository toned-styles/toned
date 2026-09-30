import type { Variants } from '@toned/core'
import { brand, fonts } from './brand.ts'
import { stylesheet } from './system.ts'

/** Editor metrics shared by the textarea, the highlighted layer and the gutter. */
export const editorMetrics = {
  fontSize: 13,
  lineHeight: 20,
  paddingY: 16,
  paddingX: 16,
} as const

const editorText = {
  fontFamily: fonts.mono,
  fontSize: `${editorMetrics.fontSize}px`,
  lineHeight: `${editorMetrics.lineHeight}px`,
  tabSize: 2,
  whiteSpace: 'pre',
  letterSpacing: 0,
  fontVariantLigatures: 'none',
} as const

const control = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  height: '32px',
  paddingX: 3,
  fontSize: '13px',
  fontWeight: 600,
  '@platform web': {
    $style: {
      color: brand.ink,
      backgroundColor: brand.surface,
      border: `1px solid ${brand.border}`,
      borderRadius: 8,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      fontFamily: fonts.sans,
    },
  },
  ':hover': {
    '@platform web': {
      $style: { borderColor: '#c3cced', backgroundColor: brand.blueTint },
    },
  },
} as const

const frame = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginX: 'auto',
  width: '100%',
  minHeight: '100%',
  '@platform web': {
    $style: { transition: 'max-width 180ms ease' },
  },
} as const

const panel = {
  display: 'flex',
  flexLayout: 'column',
  minWidth: '0px',
  minHeight: '0px',
  overflow: 'hidden',
  '@platform web': {
    $style: {
      backgroundColor: brand.surface,
      border: `1px solid ${brand.border}`,
      borderRadius: 12,
      boxShadow: '0 1px 2px #17234b0a, 0 12px 32px #17234b0d',
    },
  },
} as const

export const playgroundEditorStyles = stylesheet({
  Page: {
    display: 'flex',
    flexLayout: 'column',
    minHeight: '100vh',
    fontFamily: fonts.sans,
    fontSize: '14px',
    '@platform web': {
      $style: {
        color: brand.ink,
        backgroundColor: brand.page,
        WebkitFontSmoothing: 'antialiased',
      },
    },
    '@md': {
      '@platform web': { $style: { height: '100dvh', overflow: 'hidden' } },
    },
  },
  Main: {
    display: 'flex',
    flexLayout: 'column',
    flexGrow: '1',
    minHeight: '0px',
  },
  Toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    paddingX: 3,
    paddingTop: 3,
    '@md': { flexWrap: 'nowrap', paddingX: 4 },
  },
  ToolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    minWidth: '0px',
    '@md': { gap: 3 },
  },
  Title: {
    $kind: 'text',
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    '@platform web': { $style: { color: brand.ink, whiteSpace: 'nowrap' } },
  },
  Summary: {
    $kind: 'text',
    display: 'none',
    fontSize: '13px',
    '@platform web': {
      $style: {
        color: brand.muted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    },
    '@lg': { display: 'block' },
  },
  SelectLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    fontSize: '13px',
    fontWeight: 600,
    '@platform web': { $style: { color: brand.muted } },
  },
  Select: {
    ...control,
    paddingRight: 8,
    '@platform web': {
      $style: {
        color: brand.ink,
        backgroundColor: brand.surface,
        border: `1px solid ${brand.border}`,
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: fonts.sans,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235d6784' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        maxWidth: '100%',
      },
    },
  },
  Button: control,
  PrimaryButton: {
    ...control,
    '@platform web': {
      $style: {
        color: '#fff',
        backgroundColor: brand.blue,
        border: `1px solid ${brand.blue}`,
        borderRadius: 8,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: fonts.sans,
      },
    },
    ':hover': {
      '@platform web': { $style: { backgroundColor: brand.blueHover } },
    },
  },
  StudioLink: {
    display: 'none',
    fontSize: '13px',
    fontWeight: 600,
    '@platform web': {
      $style: { color: brand.blue, whiteSpace: 'nowrap' },
    },
    '@lg': { display: 'inline' },
  },
  Pill: {
    $kind: 'text',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    height: '28px',
    paddingX: 3,
    fontSize: '12px',
    fontWeight: 600,
    '@platform web': {
      $style: {
        borderRadius: 999,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        color: brand.muted,
        backgroundColor: brand.blueTint,
        border: `1px solid ${brand.divider}`,
      },
    },
  },
  Dot: {
    width: '8px',
    height: '8px',
    '@platform web': {
      $style: {
        borderRadius: 999,
        backgroundColor: brand.faint,
        flexShrink: 0,
      },
    },
  },
  Workspace: {
    display: 'flex',
    flexLayout: 'column',
    gap: 3,
    padding: 3,
    '@md': {
      display: 'grid',
      gap: 0,
      paddingX: 4,
      paddingBottom: 4,
      paddingTop: 3,
      flexGrow: '1',
      minHeight: '0px',
    },
  },
  EditorPanel: {
    ...panel,
    height: '460px',
    '@md': { height: 'auto' },
  },
  PreviewPanel: {
    ...panel,
    minHeight: '480px',
    '@md': { minHeight: '0px' },
  },
  TabBar: {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 2,
    height: '44px',
    paddingX: 2,
    '@platform web': {
      $style: {
        borderBottom: `1px solid ${brand.divider}`,
        backgroundColor: brand.surface,
        flexShrink: 0,
      },
    },
  },
  TabList: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 1,
    minWidth: '0px',
    '@platform web': { $style: { overflowX: 'auto' } },
  },
  Tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    paddingX: 3,
    fontSize: '13px',
    fontWeight: 600,
    '@platform web': {
      $style: {
        color: brand.muted,
        backgroundColor: 'transparent',
        border: 0,
        borderBottom: '2px solid transparent',
        marginBottom: -1,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: fonts.sans,
      },
    },
    ':hover': { '@platform web': { $style: { color: brand.ink } } },
  },
  FileIcon: {
    $kind: 'text',
    fontSize: '10px',
    fontWeight: 700,
    paddingX: 1,
    '@platform web': {
      $style: {
        fontFamily: fonts.mono,
        borderRadius: 4,
        color: brand.blue,
        backgroundColor: brand.blueSoft,
        lineHeight: '16px',
      },
    },
  },
  TabMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: '12px',
    paddingRight: 2,
    '@platform web': { $style: { color: brand.faint, whiteSpace: 'nowrap' } },
  },
  WidthControl: {
    display: 'none',
    alignItems: 'center',
    gap: 2,
    fontSize: '12px',
    paddingRight: 2,
    '@platform web': { $style: { color: brand.faint, whiteSpace: 'nowrap' } },
    '@md': { display: 'flex' },
  },
  Editor: {
    position: 'relative',
    display: 'flex',
    flexGrow: '1',
    minHeight: '0px',
    '@platform web': {
      $style: { backgroundColor: brand.codeBg, color: brand.codeInk },
    },
  },
  Gutter: {
    position: 'relative',
    overflow: 'hidden',
    width: '48px',
    '@platform web': {
      $style: {
        ...editorText,
        flexShrink: 0,
        color: brand.faint,
        textAlign: 'right',
        userSelect: 'none',
        borderRight: `1px solid ${brand.divider}`,
      },
    },
  },
  GutterLines: {
    '@platform web': {
      $style: {
        padding: `${editorMetrics.paddingY}px 10px`,
        willChange: 'transform',
      },
    },
  },
  CodeArea: {
    position: 'relative',
    flexGrow: '1',
    minWidth: '0px',
    overflow: 'hidden',
  },
  Layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    '@platform web': {
      $style: {
        padding: `${editorMetrics.paddingY}px ${editorMetrics.paddingX}px`,
        minWidth: '100%',
        pointerEvents: 'none',
        willChange: 'transform',
        boxSizing: 'border-box',
      },
    },
  },
  Highlight: {
    position: 'relative',
    '@platform web': {
      $style: { ...editorText, margin: 0, padding: 0, color: brand.codeInk },
    },
  },
  ErrorBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    '@platform web': {
      $style: {
        height: `${editorMetrics.lineHeight}px`,
        backgroundColor: brand.dangerSoft,
        boxShadow: `inset 3px 0 0 ${brand.danger}`,
        pointerEvents: 'none',
      },
    },
  },
  Textarea: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    '@platform web': {
      $style: {
        ...editorText,
        margin: 0,
        padding: `${editorMetrics.paddingY}px ${editorMetrics.paddingX}px`,
        border: 0,
        outline: 'none',
        resize: 'none',
        overflow: 'auto',
        overflowWrap: 'normal',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        caretColor: brand.ink,
        backgroundColor: 'transparent',
        boxSizing: 'border-box',
      },
    },
  },
  StatusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    height: '32px',
    paddingX: 3,
    fontSize: '12px',
    '@platform web': {
      $style: {
        color: brand.muted,
        borderTop: `1px solid ${brand.divider}`,
        backgroundColor: brand.surface,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      },
    },
  },
  Hint: {
    display: 'none',
    '@md': { display: 'inline' },
  },
  Divider: {
    display: 'none',
    '@md': {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      '@platform web': {
        $style: { cursor: 'col-resize', touchAction: 'none' },
      },
    },
  },
  DividerHandle: {
    width: '4px',
    height: '40px',
    '@platform web': {
      $style: { borderRadius: 999, backgroundColor: brand.border },
    },
  },
  Controls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 3,
    paddingX: 4,
    paddingY: 3,
    '@platform web': {
      $style: {
        borderBottom: `1px solid ${brand.divider}`,
        backgroundColor: brand.surface,
        flexShrink: 0,
      },
    },
  },
  ControlsLabel: {
    $kind: 'text',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    '@platform web': {
      $style: { color: brand.faint, textTransform: 'uppercase' },
    },
  },
  Control: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    fontSize: '13px',
    fontWeight: 600,
    '@platform web': { $style: { color: brand.body } },
  },
  SmallSelect: {
    ...control,
    height: '28px',
    paddingX: 2,
    paddingRight: 7,
    fontSize: '12px',
    '@platform web': {
      $style: {
        color: brand.ink,
        backgroundColor: brand.surface,
        border: `1px solid ${brand.border}`,
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: fonts.sans,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235d6784' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
      },
    },
  },
  Checkbox: {
    width: '16px',
    height: '16px',
    '@platform web': { $style: { accentColor: brand.blue, margin: 0 } },
  },
  Note: {
    $kind: 'text',
    fontSize: '12px',
    '@platform web': { $style: { color: brand.faint } },
  },
  Stage: {
    position: 'relative',
    display: 'flex',
    flexGrow: '1',
    minHeight: '0px',
    padding: 5,
    '@platform web': {
      $style: {
        overflow: 'auto',
        backgroundColor: brand.page,
        backgroundImage: `radial-gradient(${brand.border} 1px, transparent 1px)`,
        backgroundSize: '16px 16px',
      },
    },
  },
  Frame: frame,
  FramedBox: {
    ...frame,
    '@platform web': {
      $style: {
        transition: 'max-width 180ms ease',
        outline: `1px dashed ${brand.border}`,
        outlineOffset: 8,
        borderRadius: 4,
      },
    },
  },
  PreviewRoot: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  Placeholder: {
    $kind: 'text',
    margin: 'auto',
    fontSize: '13px',
    '@platform web': { $style: { color: brand.faint } },
  },
  Problem: {
    display: 'flex',
    flexLayout: 'column',
    gap: 1,
    paddingX: 4,
    paddingY: 3,
    '@platform web': {
      $style: {
        backgroundColor: brand.dangerSoft,
        borderTop: '1px solid #f3c9c4',
        color: brand.danger,
        flexShrink: 0,
        maxHeight: '40%',
        overflow: 'auto',
      },
    },
  },
  ProblemHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    fontSize: '12px',
    fontWeight: 700,
    '@platform web': { $style: { letterSpacing: '0.02em' } },
  },
  ProblemLink: {
    fontSize: '12px',
    fontWeight: 600,
    '@platform web': {
      $style: {
        fontFamily: fonts.mono,
        color: brand.danger,
        background: 'none',
        border: 0,
        padding: 0,
        textDecoration: 'underline',
        textUnderlineOffset: 3,
        cursor: 'pointer',
      },
    },
  },
  ProblemMessage: {
    $kind: 'text',
    '@platform web': {
      $style: {
        fontFamily: fonts.mono,
        fontSize: '12px',
        lineHeight: '18px',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        margin: 0,
        color: '#7d1a14',
      },
    },
  },
  ProblemNote: {
    $kind: 'text',
    fontSize: '12px',
    '@platform web': { $style: { color: brand.body } },
  },
  Output: {
    flexGrow: '1',
    minHeight: '0px',
    '@platform web': {
      $style: { overflow: 'auto', backgroundColor: brand.codeBg },
    },
  },
  OutputSection: {
    display: 'flex',
    flexLayout: 'column',
    '@platform web': { $style: { borderBottom: `1px solid ${brand.divider}` } },
  },
  OutputHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 2,
    paddingX: 4,
    paddingTop: 3,
    fontSize: '12px',
    fontWeight: 700,
    '@platform web': { $style: { color: brand.ink } },
  },
  OutputMeta: {
    $kind: 'text',
    fontSize: '12px',
    fontWeight: 500,
    '@platform web': { $style: { color: brand.faint } },
  },
  OutputCode: {
    '@platform web': {
      $style: {
        ...editorText,
        fontSize: '12px',
        lineHeight: '19px',
        margin: 0,
        padding: '12px 16px 16px',
        overflowX: 'auto',
        color: brand.codeInk,
      },
    },
  },
  Empty: {
    $kind: 'text',
    paddingX: 4,
    paddingY: 4,
    fontSize: '13px',
    '@platform web': { $style: { color: brand.muted } },
  },
}).variants(
  (
    $: Variants<{
      active: boolean
      status: 'loading' | 'ok' | 'error'
    }>,
  ) => ({
    [$.active(true)]: {
      Tab: {
        '@platform web': {
          $style: {
            color: brand.ink,
            borderBottom: `2px solid ${brand.blue}`,
          },
        },
      },
      FileIcon: {
        '@platform web': {
          $style: { color: '#fff', backgroundColor: brand.blue },
        },
      },
    },
    [$.status('ok')]: {
      Pill: {
        '@platform web': {
          $style: {
            color: brand.success,
            backgroundColor: '#eaf6ef',
            border: '1px solid #cde9d8',
          },
        },
      },
      Dot: { '@platform web': { $style: { backgroundColor: brand.success } } },
    },
    [$.status('error')]: {
      Pill: {
        '@platform web': {
          $style: {
            color: brand.danger,
            backgroundColor: brand.dangerSoft,
            border: '1px solid #f3c9c4',
          },
        },
      },
      Dot: { '@platform web': { $style: { backgroundColor: brand.danger } } },
    },
  }),
  { defaults: { active: false, status: 'loading' } },
)
