import { type Variants, webRules } from '@toned/core'
import { brand, fonts, headerHeight } from './brand.ts'
import { stylesheet } from './system.ts'

const stickyTop = `${headerHeight}px`

/** The header every page shares. */
export const headerStyles = stylesheet({
  Bar: {
    position: 'sticky',
    zIndex: 50,
    '@platform web': {
      $style: {
        top: 0,
        backgroundColor: '#fbfcffe6',
        backdropFilter: 'saturate(1.4) blur(12px)',
        borderBottom: `1px solid ${brand.divider}`,
      },
    },
  },
  Inner: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    height: '64px',
    maxWidth: '1440px',
    marginX: 'auto',
    paddingX: 4,
    '@md': { paddingX: 8, gap: 8 },
  },
  Logo: { display: 'flex', alignItems: 'center', flexShrink: '0' },
  Nav: {
    display: 'none',
    alignItems: 'center',
    gap: 1,
    flexGrow: '1',
    '@md': { display: 'flex' },
  },
  Spacer: { flexGrow: '1', '@md': { display: 'none' } },
  Link: {
    paddingX: 3,
    paddingY: 1.5,
    borderRadius: 'medium',
    fontSize: '14px',
    fontWeight: 500,
    '@platform web': {
      $style: {
        color: brand.muted,
        transition: 'color .15s, background-color .15s',
      },
    },
    ':hover': {
      '@platform web': {
        $style: { color: brand.ink, backgroundColor: brand.blueTint },
      },
    },
  },
  Actions: { display: 'flex', alignItems: 'center', gap: 2 },
  IconLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: 'medium',
    '@platform web': { $style: { color: brand.muted } },
    ':hover': {
      '@platform web': {
        $style: { color: brand.ink, backgroundColor: brand.blueTint },
      },
    },
  },
  MenuButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: 'medium',
    cursor: 'pointer',
    '@platform web': {
      $style: {
        color: brand.ink,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
        backgroundColor: brand.surface,
      },
    },
    '@md': { display: 'none' },
  },
  MobileNav: {
    display: 'none',
    flexLayout: 'column',
    gap: 1,
    paddingX: 4,
    paddingBottom: 4,
    '@platform web': { $style: { borderTop: `1px solid ${brand.divider}` } },
  },
  MobileLink: {
    paddingY: 2.5,
    fontSize: '16px',
    fontWeight: 500,
    '@platform web': { $style: { color: brand.ink } },
  },
}).variants(($: Variants<{ active?: boolean }>) => ({
  [$.active(true)]: {
    Link: {
      '@platform web': {
        $style: { color: brand.blue, backgroundColor: brand.blueSoft },
      },
    },
    MobileLink: { '@platform web': { $style: { color: brand.blue } } },
  },
}))

/** Documentation shell: sidebar, article column and on-this-page rail. */
export const docsStyles = stylesheet({
  Page: {
    minHeight: '100vh',
    fontFamily: fonts.sans,
    fontSize: '16px',
    lineHeight: 1.6,
    '@platform web': {
      $style: {
        color: brand.ink,
        backgroundColor: brand.page,
        WebkitFontSmoothing: 'antialiased',
      },
    },
  },
  Shell: {
    display: 'flex',
    maxWidth: '1440px',
    marginX: 'auto',
    alignItems: 'flex-start',
    '@md': { paddingX: 4 },
  },
  Sidebar: {
    display: 'none',
    flexShrink: '0',
    width: '264px',
    position: 'sticky',
    overflowY: 'auto',
    paddingY: 8,
    paddingX: 4,
    '@platform web': {
      $style: {
        top: stickyTop,
        height: `calc(100vh - ${stickyTop})`,
        overscrollBehavior: 'contain',
      },
    },
    '@md': { display: 'block' },
  },
  Main: {
    flexGrow: '1',
    $style: { minWidth: 0 },
    paddingX: 5,
    paddingTop: 8,
    paddingBottom: 16,
    '@md': { paddingX: 10, paddingTop: 12 },
  },
  Article: { maxWidth: '760px', marginX: 'auto', $style: { minWidth: 0 } },
  Wide: { maxWidth: '1040px', marginX: 'auto', $style: { minWidth: 0 } },
  Gallery: { maxWidth: '1180px', marginX: 'auto', $style: { minWidth: 0 } },
  Rail: {
    display: 'none',
    flexShrink: '0',
    width: '220px',
    position: 'sticky',
    paddingY: 12,
    paddingRight: 4,
    '@platform web': {
      $style: {
        top: stickyTop,
        maxHeight: `calc(100vh - ${stickyTop})`,
        overflowY: 'auto',
      },
    },
    '@xl': { display: 'block' },
  },
  Breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: 3,
    '@platform web': { $style: { color: brand.blue } },
  },
  Title: {
    fontWeight: 650,
    lineHeight: 1.1,
    letterSpacing: '-0.035em',
    '@platform web': {
      $style: {
        color: brand.ink,
        fontSize: 'clamp(2.1rem, 4vw, 2.75rem)',
        textWrap: 'balance',
      },
    },
  },
  Lead: {
    marginTop: 4,
    fontSize: '19px',
    lineHeight: 1.6,
    '@platform web': { $style: { color: brand.muted, textWrap: 'pretty' } },
  },
  Meta: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 3,
    marginTop: 5,
    fontSize: '13px',
    '@platform web': { $style: { color: brand.faint } },
  },
  MetaLink: {
    fontWeight: 600,
    '@platform web': { $style: { color: brand.blue } },
    ':hover': { '@platform web': { $style: { textDecoration: 'underline' } } },
  },
  HeaderRule: {
    marginTop: 8,
    marginBottom: 2,
    '@platform web': { $style: { borderBottom: `1px solid ${brand.divider}` } },
  },
  // Mobile drawer for the sidebar (CSS-only; see index.html).
  Drawer: {
    display: 'none',
    position: 'fixed',
    zIndex: 45,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: 'auto',
    paddingX: 5,
    paddingY: 6,
    '@platform web': {
      $style: { top: stickyTop, backgroundColor: brand.page },
    },
    '@md': { display: 'none' },
  },
})

export const sidebarStyles = stylesheet({
  Group: { flexLayout: 'column', gap: 0.5, marginBottom: 6 },
  Heading: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    paddingX: 3,
    paddingBottom: 1.5,
    '@platform web': { $style: { color: brand.ink } },
  },
  Link: {
    display: 'block',
    paddingX: 3,
    paddingY: 1.25,
    borderRadius: 'medium',
    fontSize: '14px',
    lineHeight: 1.45,
    '@platform web': {
      $style: {
        color: brand.muted,
        borderLeftWidth: 2,
        borderLeftStyle: 'solid',
        borderLeftColor: 'transparent',
        borderRadius: '0 8px 8px 0',
        transition: 'color .15s, background-color .15s',
      },
    },
    ':hover': {
      '@platform web': {
        $style: { color: brand.ink, backgroundColor: brand.blueTint },
      },
    },
  },
}).variants(($: Variants<{ active?: boolean }>) => ({
  [$.active(true)]: {
    Link: {
      fontWeight: 600,
      '@platform web': {
        $style: {
          color: brand.blue,
          backgroundColor: brand.blueSoft,
          borderLeftColor: brand.blue,
        },
      },
    },
  },
}))

export const tocStyles = stylesheet({
  Root: { flexLayout: 'column', gap: 1 },
  Heading: {
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: 2,
    '@platform web': { $style: { color: brand.ink } },
  },
  Link: {
    display: 'block',
    paddingY: 1,
    fontSize: '13px',
    lineHeight: 1.45,
    '@platform web': {
      $style: {
        color: brand.muted,
        borderLeftWidth: 2,
        borderLeftStyle: 'solid',
        borderLeftColor: brand.divider,
        paddingLeft: 12,
        transition: 'color .15s, border-color .15s',
      },
    },
    ':hover': { '@platform web': { $style: { color: brand.ink } } },
  },
}).variants(($: Variants<{ active?: boolean; depth?: 3 }>) => ({
  [$.depth(3)]: { Link: { '@platform web': { $style: { paddingLeft: 24 } } } },
  [$.active(true)]: {
    Link: {
      '@platform web': {
        $style: { color: brand.blue, borderLeftColor: brand.blue },
      },
    },
  },
}))

export const pagerStyles = stylesheet({
  Root: {
    display: 'grid',
    gap: 4,
    marginTop: 16,
    paddingTop: 8,
    '@platform web': {
      $style: {
        gridTemplateColumns: '1fr 1fr',
        borderTop: `1px solid ${brand.divider}`,
      },
    },
  },
  Card: {
    flexLayout: 'column',
    gap: 1,
    padding: 4,
    borderRadius: 'large',
    '@platform web': {
      $style: {
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
        backgroundColor: brand.surface,
        transition: 'border-color .15s, box-shadow .15s',
      },
    },
    ':hover': {
      '@platform web': {
        $style: { borderColor: brand.blue, boxShadow: '0 6px 24px #284bdd14' },
      },
    },
  },
  Label: {
    fontSize: '12px',
    '@platform web': { $style: { color: brand.faint } },
  },
  Title: {
    fontSize: '15px',
    fontWeight: 600,
    '@platform web': { $style: { color: brand.ink } },
  },
}).variants(($: Variants<{ align?: 'end' }>) => ({
  [$.align('end')]: {
    Card: {
      '@platform web': { $style: { textAlign: 'right', gridColumn: '2' } },
    },
  },
}))

/** Framed code: a header with the language and a copy button above the code. */
export const codeStyles = stylesheet({
  Frame: {
    marginY: 5,
    borderRadius: 'large',
    overflow: 'hidden',
    $style: { minWidth: 0 },
    '@platform web': {
      $style: {
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
        backgroundColor: brand.codeBg,
      },
    },
  },
  Header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    paddingLeft: 4,
    paddingRight: 1.5,
    height: '38px',
    fontSize: '12px',
    fontWeight: 600,
    '@platform web': {
      $style: {
        color: brand.faint,
        borderBottom: `1px solid ${brand.divider}`,
        backgroundColor: '#f2f4fb',
      },
    },
  },
  Copy: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    paddingX: 2.5,
    paddingY: 1,
    borderRadius: 'medium',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    '@platform web': { $style: { color: brand.muted } },
    ':hover': {
      '@platform web': {
        $style: { color: brand.ink, backgroundColor: brand.surface },
      },
    },
  },
  Pre: {
    overflowX: 'auto',
    paddingX: 4,
    paddingY: 3.5,
    '@platform web': {
      $style: {
        fontFamily: fonts.mono,
        fontSize: 13,
        lineHeight: 1.7,
        color: brand.codeInk,
        tabSize: 2,
      },
    },
  },
}).variants(($: Variants<{ bare?: boolean }>) => ({
  [$.bare(true)]: {
    Frame: {
      marginY: 0,
      '@platform web': { $style: { border: 'none', borderRadius: 0 } },
    },
  },
}))

/** Index pages: search field, grouped card grids and quick links. */
export const indexStyles = stylesheet({
  Actions: { display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 },
  Primary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    paddingX: 4,
    paddingY: 2.5,
    borderRadius: 'medium',
    fontSize: '14px',
    fontWeight: 600,
    '@platform web': { $style: { color: '#fff', backgroundColor: brand.blue } },
    ':hover': {
      '@platform web': { $style: { backgroundColor: brand.blueHover } },
    },
  },
  Secondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    paddingX: 4,
    paddingY: 2.5,
    borderRadius: 'medium',
    fontSize: '14px',
    fontWeight: 600,
    '@platform web': {
      $style: {
        color: brand.ink,
        backgroundColor: brand.surface,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
      },
    },
    ':hover': { '@platform web': { $style: { borderColor: brand.blue } } },
  },
  Search: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginTop: 10,
  },
  SearchIcon: {
    position: 'absolute',
    '@platform web': {
      $style: { left: 16, color: brand.faint, pointerEvents: 'none' },
    },
  },
  Input: {
    width: '100%',
    height: '48px',
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 'large',
    fontSize: '15px',
    '@platform web': {
      $style: {
        color: brand.ink,
        backgroundColor: brand.surface,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
        boxShadow: '0 1px 2px #17234b0a',
        outline: 'none',
      },
    },
    ':focus-visible': {
      '@platform web': {
        $style: { borderColor: brand.blue, boxShadow: '0 0 0 4px #284bdd1f' },
      },
    },
  },
  Count: {
    marginTop: 3,
    fontSize: '13px',
    '@platform web': { $style: { color: brand.faint } },
  },
  Group: { flexLayout: 'column', gap: 4, marginTop: 10 },
  GroupTitle: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    '@platform web': { $style: { color: brand.muted } },
  },
  Grid: {
    display: 'grid',
    gap: 4,
    '@platform web': {
      $style: { gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' },
    },
  },
  Card: {
    flexLayout: 'column',
    gap: 2,
    padding: 5,
    borderRadius: 'large',
    '@platform web': {
      $style: {
        backgroundColor: brand.surface,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
      },
    },
    ':hover': {
      '@platform web': {
        $style: {
          borderColor: brand.blue,
          boxShadow: '0 10px 30px #284bdd14',
          transform: 'translateY(-1px)',
        },
      },
    },
  },
  CardTitle: {
    fontSize: '16px',
    fontWeight: 650,
    lineHeight: 1.35,
    '@platform web': { $style: { color: brand.ink } },
  },
  CardBody: {
    fontSize: '14px',
    lineHeight: 1.6,
    '@platform web': { $style: { color: brand.muted } },
  },
  CardMore: {
    marginTop: 'auto',
    paddingTop: 2,
    fontSize: '13px',
    fontWeight: 600,
    '@platform web': { $style: { color: brand.blue } },
  },
  Empty: {
    marginTop: 8,
    padding: 8,
    borderRadius: 'large',
    '@platform web': {
      $style: {
        textAlign: 'center',
        color: brand.muted,
        border: `1px dashed ${brand.border}`,
      },
    },
  },
  Note: {
    marginTop: 6,
    paddingX: 4,
    paddingY: 3,
    borderRadius: 'large',
    fontSize: '14px',
    lineHeight: 1.6,
    '@platform web': {
      $style: {
        color: brand.body,
        backgroundColor: brand.blueTint,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
      },
    },
  },
})

/** Capability lab: each experiment is a titled stage with its source below. */
export const experimentStyles = stylesheet({
  Jump: { display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 6 },
  Chip: {
    paddingX: 3,
    paddingY: 1.25,
    borderRadius: 'full',
    fontSize: '13px',
    fontWeight: 600,
    '@platform web': {
      $style: {
        color: brand.body,
        backgroundColor: brand.surface,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
      },
    },
    ':hover': {
      '@platform web': {
        $style: { color: brand.blue, borderColor: brand.blue },
      },
    },
  },
  Section: {
    flexLayout: 'column',
    gap: 5,
    marginTop: 14,
    '@platform web': { $style: { scrollMarginTop: 88 } },
  },
  Head: { display: 'flex', gap: 4, alignItems: 'flex-start' },
  Number: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    width: '36px',
    height: '36px',
    borderRadius: 'medium',
    fontSize: '13px',
    fontWeight: 700,
    '@platform web': {
      $style: { color: brand.blue, backgroundColor: brand.blueSoft },
    },
  },
  Title: {
    fontSize: '24px',
    fontWeight: 650,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
    '@platform web': { $style: { color: brand.ink } },
  },
  Summary: {
    marginTop: 1,
    fontSize: '16px',
    lineHeight: 1.6,
    '@platform web': { $style: { color: brand.muted } },
  },
  Stage: {
    padding: 6,
    borderRadius: 'xlarge',
    $style: { minWidth: 0 },
    '@platform web': {
      $style: {
        backgroundColor: brand.surface,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: brand.border,
        boxShadow: '0 1px 2px #17234b08, 0 16px 40px #284bdd0a',
      },
    },
  },
  Footer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    fontSize: '14px',
  },
  Link: {
    fontWeight: 600,
    '@platform web': { $style: { color: brand.blue } },
    ':hover': { '@platform web': { $style: { textDecoration: 'underline' } } },
  },
  Source: {
    '@platform web': {
      $webRules: webRules({
        '& > summary': {
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          color: brand.muted,
          listStyle: 'none',
        },
        '& > summary::-webkit-details-marker': { display: 'none' },
        '& > summary:hover': { color: brand.ink },
      }),
    },
  },
})

export const footerStyles = stylesheet({
  Root: {
    marginTop: 16,
    '@platform web': { $style: { borderTop: `1px solid ${brand.divider}` } },
  },
  Inner: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    maxWidth: '1440px',
    marginX: 'auto',
    paddingX: 5,
    paddingY: 10,
    fontSize: '14px',
    '@md': { paddingX: 8 },
    '@platform web': { $style: { color: brand.muted } },
  },
  Brand: { flexLayout: 'column', gap: 2 },
  Links: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  Link: {
    fontWeight: 500,
    '@platform web': { $style: { color: brand.muted } },
    ':hover': { '@platform web': { $style: { color: brand.ink } } },
  },
})
