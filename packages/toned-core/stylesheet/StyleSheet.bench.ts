import { bench, describe } from 'vitest'
import { defineSystem, defineToken, setConfig } from '../system/index.ts'
import { type Base, createStylesheet } from './StyleSheet.ts'

// Create a mock token system
const mockSystem = defineSystem({
  colors: defineToken({
    values: ['primary', 'secondary', 'text', 'background'] as const,
    resolve: (value) => ({ color: `var(--color-${value})` }),
  }),
  spacing: defineToken({
    values: ['xs', 'sm', 'md', 'lg', 'xl'] as const,
    resolve: (value) => ({ padding: `var(--spacing-${value})` }),
  }),
  fontSize: defineToken({
    values: ['xs', 'sm', 'md', 'lg'] as const,
    resolve: (value) => ({ fontSize: `var(--font-${value})` }),
  }),
})

// Complex rules similar to real-world usage
const complexRules = {
  container: {
    colors: 'background',
    spacing: 'md',
    ':hover': {
      colors: 'secondary',
    },
  },
  label: {
    colors: 'text',
    fontSize: 'sm',
  },
  icon: {
    spacing: 'xs',
  },
  '[size=sm]': {
    container: {
      spacing: 'sm',
    },
    label: {
      fontSize: 'xs',
    },
  },
  '[size=lg]': {
    container: {
      spacing: 'lg',
    },
    label: {
      fontSize: 'md',
    },
  },
  '[variant=primary]': {
    container: {
      colors: 'primary',
    },
  },
  '[variant=secondary]': {
    container: {
      colors: 'secondary',
    },
  },
}

// Setup config mock
const mockConfig = {
  getTokens: () => ({}),
  useClassName: false,
  useMedia: false,
  debug: false,
  getProps(this: Base, elementKey: string) {
    return this.getCurrentStyle(elementKey)
  },
  initRef: () => {},
  initInteraction: () => {},
}

setConfig(mockConfig)

describe('StyleSheet Performance', () => {
  bench('createStylesheet', () => {
    createStylesheet(mockSystem, complexRules)
  })

  const stylesheet = createStylesheet(mockSystem, complexRules)

  bench('SYMBOL_INIT (Base creation)', () => {
    const sym = Symbol.for('@toned/core/SYMBOL_INIT')
    stylesheet[sym](mockConfig, { size: 'sm', variant: 'primary' })
  })

  // Create an instance for element access benchmarks
  const sym = Symbol.for('@toned/core/SYMBOL_INIT')
  const instance = stylesheet[sym](mockConfig, {})

  bench('element access - container', () => {
    // @ts-expect-error dynamic property
    const _ = instance.container
  })

  bench('element access - label', () => {
    // @ts-expect-error dynamic property
    const _ = instance.label
  })

  bench('getCurrentStyle', () => {
    instance.getCurrentStyle('container')
  })

  bench('matchStyles', () => {
    instance.matchStyles()
  })

  bench('applyState - size change', () => {
    instance.applyState({ size: 'sm' })
  })

  bench('applyState - variant change', () => {
    instance.applyState({ variant: 'primary' })
  })

  bench('applyState - multiple changes', () => {
    instance.applyState({ size: 'lg', variant: 'secondary' })
  })

  // Variants chain benchmark
  bench('variants() chain', () => {
    stylesheet.variants({
      '[active]': {
        container: { colors: 'primary' },
      },
    })
  })

  // Extend benchmark
  bench('extend()', () => {
    stylesheet.extend({
      container: {
        spacing: 'xl',
      },
    })
  })
})
