import {
  expandProperties,
  finite,
  isColor,
  type MotionProperty,
} from './channels.ts'
import type { MotionOptionsBase, MotionTransition } from './index.ts'
import { supportsMotionProperty } from './properties.ts'

const fail = (message: string): never => {
  throw new Error(`[toned/motion] ${message}`)
}

export function validateTransition(transition: MotionTransition | undefined) {
  if (transition?.type === 'timing') {
    if (finite(transition.duration ?? 200, 'duration') < 0)
      fail('duration must be non-negative')
  } else if (transition?.type === 'spring') {
    for (const [key, value] of Object.entries({
      stiffness: transition.stiffness ?? 170,
      damping: transition.damping ?? 26,
      mass: transition.mass ?? 1,
      maxDuration: transition.maxDuration ?? 10000,
    }))
      if (finite(value, key) <= 0) fail(`${key} must be positive`)
  } else if (transition) fail('Unsupported transition type')
}

export function validateOptions(
  options: MotionOptionsBase & {
    states?: Readonly<Record<string, MotionTransition>> | object
  },
): void {
  if (!options.properties.length) fail('Choose at least one motion property')
  for (const property of options.properties)
    if (!supportsMotionProperty(property))
      fail(`Unsupported motion property: ${property}`)
  const properties = expandProperties(options.properties)
  for (const phase of [options.enter, options.exit])
    for (const [property, value] of Object.entries(phase ?? {})) {
      if (!properties.includes(property as MotionProperty))
        fail(`${property} is not in motion properties`)
      if (isColor(property)) {
        if (
          typeof value !== 'string' &&
          !(value && typeof value === 'object' && 'style' in value)
        )
          fail(
            `${property} takes a colour string or a token style (\`ui.t({ … })\`)`,
          )
      } else finite(value, property)
    }
  validateTransition(options.transition)
  for (const transition of Object.values(options.states ?? {}))
    validateTransition(transition as MotionTransition)
}
