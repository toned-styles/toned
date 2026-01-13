import { bench, describe } from 'vitest'
import { StyleMatcher } from './StyleMatcher.ts'

// Complex rules similar to real-world usage
const complexRules = {
  container: {
    display: 'flex',
    padding: 'md',
    ':hover': {
      backgroundColor: 'hover_bg',
    },
  },
  label: {
    fontSize: 'sm',
    color: 'text_primary',
  },
  icon: {
    size: '16',
  },
  '[size=sm]': {
    container: {
      padding: 'sm',
    },
    label: {
      fontSize: 'xs',
    },
  },
  '[size=md]': {
    container: {
      padding: 'md',
    },
    label: {
      fontSize: 'sm',
    },
  },
  '[size=lg]': {
    container: {
      padding: 'lg',
    },
    label: {
      fontSize: 'md',
    },
  },
  '[variant=primary]': {
    container: {
      backgroundColor: 'primary',
    },
    label: {
      color: 'white',
    },
  },
  '[variant=secondary]': {
    container: {
      backgroundColor: 'secondary',
    },
    label: {
      color: 'text_secondary',
    },
  },
  '[variant=accent]': {
    container: {
      backgroundColor: 'accent',
    },
  },
  '[disabled]': {
    container: {
      opacity: '0.5',
    },
    label: {
      color: 'text_disabled',
    },
  },
  '[size=sm][variant=primary]': {
    container: {
      borderRadius: 'sm',
    },
  },
  '[size=lg][variant=accent]': {
    container: {
      borderRadius: 'lg',
    },
  },
  '@media.desktop': {
    container: {
      maxWidth: '1200',
    },
  },
  '@media.tablet': {
    container: {
      maxWidth: '800',
    },
  },
}

const matcher = new StyleMatcher(complexRules)

describe('StyleMatcher Performance', () => {
  bench('construction', () => {
    new StyleMatcher(complexRules)
  })

  bench('match() - simple props', () => {
    matcher.match({ size: 'sm', variant: 'primary' })
  })

  bench('match() - with disabled', () => {
    matcher.match({ size: 'md', variant: 'secondary', disabled: 'true' })
  })

  bench('match() - with pseudo state', () => {
    matcher.match({
      size: 'lg',
      variant: 'accent',
      'container:hover': true,
    })
  })

  bench('match() - with media query', () => {
    matcher.match({
      size: 'sm',
      variant: 'primary',
      '@media.desktop': true,
    })
  })

  bench('match() - full props', () => {
    matcher.match({
      size: 'lg',
      variant: 'accent',
      disabled: 'true',
      'container:hover': true,
      '@media.desktop': true,
      '@media.tablet': false,
    })
  })

  bench('getPropsBits()', () => {
    matcher.getPropsBits({ size: 'sm', variant: 'primary' })
  })

  bench('getPropsBits() - complex', () => {
    matcher.getPropsBits({
      size: 'lg',
      variant: 'accent',
      disabled: 'true',
    })
  })
})
