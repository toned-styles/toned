import { defineSystem, dp, percent } from '../index.ts'

const ui = defineSystem({
  id: 'fixed-queries-types',
  tokens: {},
  conditions: { containers: { card: {} } },
})
const mediaKey: '@>=600px' = ui.q.media(dp(600))
const containerKey: '@card/>=300px' = ui.q.container('card', dp(300))
void mediaKey
void containerKey
// @ts-expect-error percentage thresholds depend on layout and are not portable query lengths
ui.q.media(percent(50))
// @ts-expect-error fixed query lengths still require a declared container name
ui.q.container('missing', dp(300))
// @ts-expect-error container queries reject percentage lengths too
ui.q.container('card', percent(50))
ui.stylesheet((q) => ({
  Root: {
    [q.media(dp(600))]: { $style: { opacity: 0 } },
    [q.container('card', dp(300))]: { $style: { opacity: 1 } },
  },
}))
// @ts-expect-error a computed fixed media key does not permit token typos beside it
ui.stylesheet((q) => ({
  Root: { typo: 1, [q.media(dp(600))]: { $style: { opacity: 0 } } },
}))
// @ts-expect-error portable queries reject font relative lengths
ui.stylesheet({ Root: { '@>=30rem': { $style: { opacity: 0 } } } })

const namedFixed = defineSystem({
  id: 'named-fixed-keys',
  tokens: {},
  conditions: { containers: { card: { wide: dp(300) } } },
})
namedFixed.stylesheet((q) => ({
  Root: {
    [q.container('card', dp(400))]: { $style: { opacity: 0 } },
    '@container card wide': { $style: { opacity: 1 } },
  },
}))
