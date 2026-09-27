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
test('declarations are immutable and top-level selector lists must use separate anchors', () => {
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

test('CSS media groups preserve rem thresholds, cascade order, scope and identity', () => {
  const groups = {
    '(min-width: 40rem)': webRules({ '&': { display: 'flex' } }),
    '(min-width: 80rem)': webRules({ '& > span': { display: 'none' } }),
  }
  const value = webRules({ '&': { display: 'block' } }, { media: groups })
  groups['(min-width: 40rem)'] = webRules({ '&': { display: 'none' } })
  const { className, css } = compileWebRules(value, 'portal', '.scope')
  expect(css).toBe(
    `.scope .${className}{display:block;}\n@media (min-width: 40rem){\n.scope .${className}{display:flex;}\n}\n@media (min-width: 80rem){\n.scope .${className} > span{display:none;}\n}`,
  )
  expect(Object.isFrozen(value.media)).toBe(true)
  expect(
    compileWebRules(webRules(value.rules, { media: groups }), 'portal')
      .className,
  ).not.toBe(className)
  expect(compileWebRules(webRules(value.rules), 'portal').className).not.toBe(
    className,
  )
  for (const query of [
    '',
    '(width: 1px) {} body',
    'screen; color:red',
    'screen/*',
    '@import "x"',
  ])
    expect(() => webRules({}, { media: { [query]: value } })).toThrow(
      /media query/,
    )
})

test('anchors nesting selectors without changing quoted attribute ampersands', () => {
  const artifact = compileWebRules(
    webRules({ '&[data-value="A&B"]': { opacity: 0.5 } }),
  )
  expect(artifact.css).toContain('[data-value="A&B"]')
  expect(artifact.css).toContain(`.${artifact.className}[`)
})

test('nested selector lists and quoted commas remain one anchored selector', () => {
  const value = webRules({
    '&:is(:hover, :focus)': { opacity: 0.5 },
    '&:not(a, b)': { color: 'red' },
    '&[data-x="a,b"]': { color: 'blue' },
    '& ~ *': { opacity: 0.25 },
  })
  const { className, css } = compileWebRules(value)
  expect(css).toContain(`.${className}:is(:hover, :focus){`)
  expect(css).toContain(`.${className}:not(a, b){`)
  expect(css).toContain(`.${className}[data-x="a,b"]{`)
  // Anchoring is a selector identity contract, not a descendant-only sandbox.
  expect(css).toContain(`.${className} ~ *{`)
  for (const selector of [
    '&:is(:hover, :focus), body',
    '&[data-x="a,b"], body',
    '&:is(:hover',
  ] as const) {
    const input: Record<`&${string}`, { opacity: 0 }> = {
      [selector]: { opacity: 0 },
    }
    expect(() => webRules(input)).toThrow(/anchored/)
  }
})
