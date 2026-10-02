import { defineSystem } from '@toned/core'
import { system as baseTokens } from '@toned/systems/base'

const { breakpoints, ...tokens } = baseTokens

/**
 * The base vocabulary as a complete system, so the web build, the web
 * renderer and the native renderer can all name it. It has no namespace `id`
 * because the shadcn theme CSS defines unprefixed custom properties.
 */
export const ui = defineSystem(tokens, { breakpoints })
