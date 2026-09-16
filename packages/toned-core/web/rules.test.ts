import { expect, test } from 'vitest'
import { compileWebRules, webRules } from './rules.ts'

test('webRules emits anchored selectors and preserves CSS numeric serialization', () => {
  const value = webRules({
    '&::before': { content: '"*"', width: 12, opacity: 0.5, '--size': 4 },
    '& > input:checked': { color: 'red' },
  })
  const { className, css } = compileWebRules(value, 'example')
  expect(css).toBe(
    `.${className}::before{content:"*";width:12px;opacity:0.5;--size:4;}\n.${className} > input:checked{color:red;}`,
  )
  expect(compileWebRules(value, 'other').className).not.toBe(className)
  expect(compileWebRules(webRules({ '&': { opacity: 0 } })).className).not.toBe(
    className,
  )
})
test('declarations are immutable and unanchored selectors cannot escape the owning part', () => {
  const input = { '&::after': { opacity: 1 } }
  const value = webRules(input)
  input['&::after'].opacity = 0
  expect(value.rules['&::after']!.opacity).toBe(1)
  expect(Object.isFrozen(value.rules['&::after'])).toBe(true)
  expect(() => webRules({ '&, body': { opacity: 0 } })).toThrow(/anchored/)
  expect(() => webRules({ '& { body': { opacity: 0 } })).toThrow(/anchored/)
})

function types() {
  // @ts-expect-error CSS declaration typos are rejected
  webRules({ '&::before': { opactiy: 1 } })
  // @ts-expect-error arbitrary selectors must be anchored
  webRules({ body: { opacity: 1 } })
}
void types

test('anchors nesting selectors without changing quoted attribute ampersands', () => {
  const artifact = compileWebRules(
    webRules({ '&[data-value="A&B"]': { opacity: 0.5 } }),
  )
  expect(artifact.css).toContain('[data-value="A&B"]')
  expect(artifact.css).toContain(`.${artifact.className}[`)
})
