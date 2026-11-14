/**
 * Compile-time contracts for `defineMotion`: transition keys are the
 * system's declared states (or a `q` query of them), and a system that
 * declares only static targets refuses motion. `tsc` is the test.
 */
import { defineSystem, defineToken } from '../system/index.ts'
import { defineMotion } from './index.ts'

const opacity = defineToken({
  values: [0, 1] as const,
  resolve: (value) => ({ opacity: value }),
})
const ui = defineSystem({
  id: 'motion-types',
  tokens: { opacity },
  conditions: { states: { open: "[data-state='open']", saving: '[data-s]' } },
})
const mail = defineSystem({
  id: 'motion-mail',
  targets: ['email'],
  tokens: { opacity },
})
const site = defineSystem({
  id: 'motion-site',
  targets: ['web', 'email'],
  tokens: { opacity },
})

// Declared, built-in and compound states.
defineMotion(ui, {
  properties: ['opacity', 'backgroundColor', 'translateY'],
  states: {
    ':open': { type: 'spring' },
    ':hover': { type: 'timing', duration: 100 },
    [ui.q.all(ui.q.state('open'), ui.q.state('saving'))]: { type: 'timing' },
  },
  enter: { opacity: 0, backgroundColor: '#fff', translateY: 8 },
})

defineMotion(ui, {
  properties: ['opacity'],
  // @ts-expect-error Unknown state ':opne'. Did you mean ':open'?
  states: { ':opne': { type: 'spring' } },
})

defineMotion(ui, {
  properties: ['backgroundColor'],
  // @ts-expect-error a colour takes a colour string or a token style
  enter: { backgroundColor: 0 },
})

defineMotion(ui, {
  // @ts-expect-error not a motion property
  properties: ['zIndex'],
})

// @ts-expect-error Motion runs on web and native targets; email only.
defineMotion(mail, { properties: ['opacity'] })

// A system with a web target animates on web.
defineMotion(site, { properties: ['opacity'] })
