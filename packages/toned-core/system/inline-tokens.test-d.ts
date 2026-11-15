/**
 * Compile-time contracts for tokens written inline in `defineSystem`: each
 * `defineToken` infers its values from its own `values`, so `resolve` sees the
 * value union, not `any`, in both the descriptor and the legacy form. `tsc`
 * is the test.
 */
import { defineSystem, defineToken } from './index.ts'

const palette = { ink: '#000', paper: '#fff' } as const

// The legacy form, `defineSystem(tokens)`.
defineSystem({
  textColor: defineToken({
    values: ['ink', 'paper'] as const,
    resolve: (value) => {
      const exact: 'ink' | 'paper' = value
      // @ts-expect-error — value is the union, not any
      const wrong: number = value
      void wrong
      return { color: palette[exact] }
    },
  }),
})

// The descriptor form.
defineSystem({
  id: 'inline-tokens',
  tokens: {
    textColor: defineToken({
      values: ['ink', 'paper'] as const,
      resolve: (value) => {
        // @ts-expect-error — value is the union, not any
        const wrong: number = value
        void wrong
        return { color: palette[value] }
      },
    }),
  },
})
