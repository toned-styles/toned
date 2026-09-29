import type { Variants } from '@toned/core'
import { stylesheet } from './system.ts'

const ink = '#17234b'
const blue = '#284bdd'
const muted = '#58627d'

export const homeStyles = stylesheet({
  Page: {
    fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif',
    fontSize: '16px',
    lineHeight: 1.6,
    '@platform web': {
      $style: {
        color: ink,
        backgroundColor: '#fbfcff',
        WebkitFontSmoothing: 'antialiased',
      },
    },
  },
  Container: {
    width: '100%',
    maxWidth: '1200px',
    marginX: 'auto',
    paddingX: 5,
    '@md': { paddingX: 10 },
  },
  Header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingY: 6,
  },
  Logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: '27px',
    fontWeight: 700,
    letterSpacing: '-0.06em',
    '@platform web': { $style: { color: blue } },
  },
  Nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    fontSize: '13px',
    fontWeight: 500,
    '@md': { gap: 8 },
  },
  DesktopLink: { display: 'none', '@md': { display: 'inline' } },
  Hero: {
    display: 'flex',
    flexLayout: 'column',
    alignItems: 'center',
    gap: 7,
    paddingTop: 14,
    paddingBottom: 12,
    '@platform web': { $style: { textAlign: 'center' } },
    '@md': { paddingTop: 20, paddingBottom: 16 },
  },
  Note: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: '13px',
    '@platform web': { $style: { color: muted } },
  },
  Title: {
    maxWidth: '950px',
    fontWeight: 600,
    lineHeight: 1.02,
    letterSpacing: '-0.07em',
    '@platform web': {
      $style: {
        fontSize: 'clamp(3.25rem, 7.8vw, 6.5rem)',
        color: blue,
        textWrap: 'balance',
      },
    },
  },
  Lead: {
    maxWidth: '610px',
    fontSize: '18px',
    lineHeight: 1.6,
    '@platform web': { $style: { color: muted } },
    '@md': { fontSize: '20px' },
  },
  Actions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  Primary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingX: 6,
    paddingY: 3,
    fontSize: '14px',
    fontWeight: 600,
    '@platform web': {
      $style: { backgroundColor: blue, color: '#fff', borderRadius: 8 },
    },
    ':hover': { opacity: 0.88 },
  },
  Secondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingX: 6,
    paddingY: 3,
    fontSize: '14px',
    fontWeight: 600,
    '@platform web': {
      $style: {
        border: '1px solid #dce2f4',
        borderRadius: 8,
        backgroundColor: '#fff',
      },
    },
    ':hover': { '@platform web': { $style: { backgroundColor: '#edf1ff' } } },
  },
  Studio: {
    overflow: 'hidden',
    '@platform web': {
      $style: {
        border: '1px solid #dce2f4',
        borderRadius: 20,
        backgroundColor: '#fff',
        boxShadow: '0 24px 80px #284bdd0a',
      },
    },
  },
  StudioBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 3,
    paddingX: 6,
    paddingY: 4,
    fontSize: '13px',
    '@platform web': { $style: { borderBottom: '1px solid #e6eaf5' } },
  },
  Muted: { fontSize: '13px', '@platform web': { $style: { color: muted } } },
  StudioGrid: {
    display: 'grid',
    gap: 6,
    padding: 5,
    '@md': {
      padding: 7,
      '@platform web': {
        $style: { gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 0.65fr)' },
      },
      gap: 10,
    },
  },
  Preview: {
    display: 'flex',
    alignItems: 'center',
    minWidth: '0',
    minHeight: '360px',
  },
  Controls: {
    display: 'flex',
    flexLayout: 'column',
    justifyContent: 'center',
    gap: 5,
    minWidth: '0',
  },
  Field: {
    display: 'flex',
    flexLayout: 'column',
    gap: 2,
    '@platform web': { $style: { border: 0, minWidth: 0 } },
  },
  Label: { fontSize: '13px', fontWeight: 600 },
  Choices: { display: 'flex', flexWrap: 'wrap', gap: 2 },
  Choice: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingX: 3,
    paddingY: 2,
    fontSize: '13px',
    '@platform web': {
      $style: {
        border: '1px solid #dce2f4',
        borderRadius: 7,
        backgroundColor: '#fff',
      },
    },
  },
  Selection: {
    fontSize: '12px',
    lineHeight: 1.8,
    padding: 4,
    overflowX: 'auto',
    '@platform web': {
      $style: { backgroundColor: '#f2f5ff', borderRadius: 8, color: blue },
    },
  },
  StudioFooter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'space-between',
    paddingX: 6,
    paddingY: 4,
    fontSize: '12px',
    '@platform web': {
      $style: {
        color: muted,
        backgroundColor: '#f8faff',
        borderTop: '1px solid #e6eaf5',
      },
    },
  },
  Section: {
    display: 'flex',
    flexLayout: 'column',
    gap: 12,
    paddingY: 16,
    '@md': { paddingY: 24 },
  },
  SectionIntro: {
    minWidth: '0',
    width: '100%',
    display: 'flex',
    flexLayout: 'column',
    gap: 4,
    maxWidth: '660px',
  },
  Heading: {
    fontWeight: 600,
    letterSpacing: '-0.055em',
    lineHeight: 1.12,
    '@platform web': {
      $style: { fontSize: 'clamp(2.2rem, 4.5vw, 3.7rem)', textWrap: 'balance' },
    },
  },
  Body: {
    fontSize: '17px',
    maxWidth: '620px',
    '@platform web': { $style: { color: muted } },
  },
  Features: {
    display: 'grid',
    gap: 10,
    '@md': {
      '@platform web': {
        $style: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
      },
      gap: 12,
    },
  },
  Feature: { display: 'flex', flexLayout: 'column', gap: 4, minWidth: '0' },
  FeatureIcon: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 600,
    '@platform web': {
      $style: { color: blue, backgroundColor: '#edf1ff', borderRadius: 12 },
    },
  },
  FeatureHeading: {
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.03em',
  },
  FeatureBody: {
    fontSize: '15px',
    '@platform web': { $style: { color: muted } },
  },
  TextLink: {
    fontSize: '14px',
    fontWeight: 600,
    '@platform web': { $style: { color: blue } },
    ':hover': { textDecoration: 'underline' },
  },
  SourceSection: {
    paddingY: 16,
    '@platform web': { $style: { backgroundColor: '#edf1ff' } },
    '@md': { paddingY: 20 },
  },
  SourceGrid: {
    display: 'grid',
    '@platform web': { $style: { gridTemplateColumns: 'minmax(0, 1fr)' } },
    gap: 10,
    alignItems: 'flex-start',
    '@md': {
      '@platform web': {
        $style: { gridTemplateColumns: '0.85fr minmax(0, 1.15fr)' },
      },
      gap: 16,
    },
  },
  Source: {
    minWidth: '0',
    '@platform web': {
      $style: {
        backgroundColor: '#fff',
        border: '1px solid #dce2f4',
        borderRadius: 12,
      },
    },
  },
  SourceScroll: {
    overflow: 'auto',
    maxHeight: '390px',
    padding: 5,
    fontSize: '12px',
    lineHeight: 1.8,
  },
  Steps: { display: 'flex', flexLayout: 'column', gap: 6 },
  Step: { display: 'flex', gap: 4, alignItems: 'flex-start' },
  StepNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    '@platform web': {
      $style: {
        border: '1px solid #bac8ff',
        color: blue,
        borderRadius: 999,
        flexShrink: 0,
      },
    },
    fontSize: '12px',
  },
  Banner: {
    display: 'flex',
    flexLayout: 'column',
    gap: 8,
    padding: 8,
    '@platform web': {
      $style: { backgroundColor: blue, color: '#fff', borderRadius: 16 },
    },
    '@md': {
      padding: 14,
      flexLayout: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
  BannerTitle: {
    fontSize: '36px',
    letterSpacing: '-0.05em',
    lineHeight: 1.15,
    fontWeight: 600,
  },
  BannerText: {
    fontSize: '16px',
    '@platform web': { $style: { color: '#dce4ff' } },
  },
  BannerLink: {
    paddingX: 5,
    paddingY: 3,
    fontSize: '14px',
    fontWeight: 600,
    '@platform web': {
      $style: {
        backgroundColor: '#fff',
        color: blue,
        borderRadius: 8,
        whiteSpace: 'nowrap',
      },
    },
  },
  Footer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 5,
    paddingY: 10,
    fontSize: '13px',
    '@platform web': { $style: { color: muted } },
  },
  FooterLinks: { display: 'flex', flexWrap: 'wrap', gap: 6 },
})

export const choiceStyles = stylesheet({
  Button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingX: 3,
    paddingY: 2,
    minHeight: '44px',
    fontSize: '13px',
    '@platform web': {
      $style: {
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#dce2f4',
        borderRadius: 7,
        backgroundColor: '#fff',
        color: '#17234b',
      },
    },
  },
}).variants(($: Variants<{ selected: boolean }>) => ({
  [$.selected(true)]: {
    Button: {
      '@platform web': {
        $style: {
          backgroundColor: '#e8edff',
          borderColor: '#284bdd',
          color: '#203cb2',
        },
      },
    },
  },
}))
