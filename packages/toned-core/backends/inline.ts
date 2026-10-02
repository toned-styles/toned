import type { OutputBackend, ResolvedProps } from './index.ts'
import { assertStaticPlan } from './static-plan.ts'

/** Concrete web style props for email/static HTML, with no CSS asset dependency. */
export const inlineBackend: OutputBackend = Object.freeze({
  id: 'inline-web',
  platform: 'web',
  browserConditions: false,
  validatePlan(plan) {
    assertStaticPlan(plan, 'inline')
  },
  resolve(input: ResolvedProps) {
    if (input.className)
      throw new Error('Toned inline backend: CSS classes are unsupported')
    for (const [field, value] of Object.entries(input.style)) {
      if (
        field.startsWith('--') ||
        (typeof value === 'string' && /\bvar\s*\(/i.test(value))
      )
        throw new Error(
          `Toned inline backend: ${field} requires a literal value`,
        )
      if (typeof value === 'number' && !Number.isFinite(value))
        throw new Error(`Toned inline backend: ${field} must be finite`)
      if (
        value != null &&
        typeof value !== 'string' &&
        typeof value !== 'number'
      )
        throw new Error(`Toned inline backend: unsupported value for ${field}`)
    }
    return Object.freeze({ style: Object.freeze({ ...input.style }) })
  },
})
