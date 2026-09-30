import { webRules } from '@toned/core'
import { brand, fonts } from './brand.ts'
import { stylesheet } from './system.ts'

/** Long-form documentation typography: guides, API pages and references. */
export const proseStyles = stylesheet({
  tableScroll: {
    overflowX: 'auto',
    maxWidth: '100%',
    marginY: 5,
    borderRadius: 'large',
    '@platform web': { $style: { border: `1px solid ${brand.border}` } },
  },
  table: {
    width: '100%',
    fontSize: '14px',
    '@platform web': {
      $style: { borderCollapse: 'collapse', textAlign: 'left' },
      $webRules: webRules({
        '& th': {
          fontWeight: 600,
          color: brand.ink,
          backgroundColor: brand.blueTint,
          padding: '10px 14px',
          borderBottom: `1px solid ${brand.border}`,
          whiteSpace: 'nowrap',
        },
        '& td': {
          padding: '10px 14px',
          borderBottom: `1px solid ${brand.divider}`,
          verticalAlign: 'top',
        },
        '& tr:last-child td': { borderBottom: 'none' },
        // Identifiers stay whole; the table scrolls instead.
        '& td code': { whiteSpace: 'nowrap' },
        '& p code': { overflowWrap: 'anywhere' },
      }),
    },
  },
  container: {
    fontSize: '16px',
    lineHeight: 1.75,
    '@platform web': {
      $style: { color: brand.body },
      $webRules: webRules({
        '& > h1 + p': {
          fontSize: '19px',
          lineHeight: 1.6,
          color: brand.muted,
          marginTop: '16px',
          marginBottom: '32px',
          paddingBottom: '32px',
          borderBottom: `1px solid ${brand.divider}`,
        },
        '& p': { marginTop: '16px' },
        '& a': {
          color: brand.blue,
          fontWeight: 500,
          textDecoration: 'underline',
          textDecorationColor: '#284bdd55',
          textUnderlineOffset: '3px',
        },
        '& a:hover': { textDecorationColor: brand.blue },
        '& strong': { color: brand.ink, fontWeight: 600 },
        '& ul': { paddingInlineStart: '22px', marginTop: '14px' },
        '& ol': { paddingInlineStart: '22px', marginTop: '14px' },
        '& li': { marginTop: '6px', paddingInlineStart: '4px' },
        '& li::marker': { color: brand.faint },
        '& blockquote': {
          marginTop: '20px',
          padding: '4px 0 4px 18px',
          borderLeft: `3px solid ${brand.blue}`,
          color: brand.muted,
        },
        '& hr': {
          border: 'none',
          borderTop: `1px solid ${brand.divider}`,
          margin: '40px 0',
        },
        '& h2 + p': { marginTop: '8px' },
        '& h3 + p': { marginTop: '8px' },
      }),
    },
  },
  h1: {
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
  h2: {
    fontSize: '24px',
    fontWeight: 650,
    marginTop: 12,
    lineHeight: 1.3,
    letterSpacing: '-0.02em',
    '@platform web': { $style: { color: brand.ink, scrollMarginTop: 88 } },
  },
  h3: {
    fontSize: '18px',
    fontWeight: 650,
    marginTop: 8,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
    '@platform web': { $style: { color: brand.ink, scrollMarginTop: 88 } },
  },
  code: {
    borderRadius: 'small',
    paddingY: 0.25,
    paddingX: 1.25,
    fontSize: '0.85em',
    fontWeight: 500,
    '@platform web': {
      $style: {
        fontFamily: fonts.mono,
        color: brand.codeInk,
        backgroundColor: brand.blueSoft,
      },
    },
  },
})
