import { webRules } from '@toned/core'
import { brand } from './brand.ts'
import { stylesheet } from './system.ts'

/** Long-form documentation typography: guides, API pages and references. */
export const proseStyles = stylesheet({
  tableScroll: {
    overflowX: 'auto',
    maxWidth: '100%',
    marginY: 5,
    radius: 'lg',
    border: 'all',
    borderTone: 'default',
  },
  table: {
    width: '100%',
    textStyle: 'ui',
    textAlign: 'left',
    '@platform web': {
      // No token: table layout has no native counterpart.
      $style: { borderCollapse: 'collapse' },
      // Selector escape hatch: cells come from rendered Markdown, so they
      // cannot be named parts. Raw values here mirror the token roles.
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
    textStyle: 'prose',
    text: 'body',
    '@platform web': {
      // Selector escape hatch: Markdown output is unclassed HTML.
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
    textStyle: 'title',
    weight: 'bold',
    text: 'default',
    wrap: 'balance',
  },
  h2: {
    marginTop: 12,
    textStyle: 'heading',
    weight: 'bold',
    text: 'default',
    anchor: 'below-header',
  },
  h3: {
    marginTop: 8,
    textStyle: 'subheading',
    weight: 'bold',
    text: 'default',
    anchor: 'below-header',
  },
  code: {
    paddingY: 0.25,
    paddingX: 1.25,
    radius: 'sm',
    textStyle: 'code-inline',
    weight: 'medium',
    text: 'code',
    fill: 'accent-soft',
    // No token: a key such as '@>=600px' or '=>' must show the characters to
    // type, not the code font's ligature for them.
    '@platform web': { $style: { fontVariantLigatures: 'none' } },
  },
})
