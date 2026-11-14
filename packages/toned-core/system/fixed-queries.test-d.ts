import { defineSystem, dp, percent } from '../index.ts'

const ui = defineSystem({
  id: 'fixed-queries-types',
  tokens: {},
  conditions: {
    containers: { card: {} },
    widths: { media: [600], containers: { card: [300] } },
  },
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

// --- an undeclared width is refused (the corpus checks the message names the
// fix: scorecard/corpus/cases/undeclared-width*.ts) -----------------------------

// @ts-expect-error 700 is not declared in conditions.widths.media
ui.q.media(dp(700))
// @ts-expect-error 400 is not declared in conditions.widths.containers.card
ui.q.container('card', dp(400))
// @ts-expect-error the literal key needs the width declared too
ui.stylesheet({ Root: { '@>=700px': { $style: { opacity: 0 } } } })
// @ts-expect-error and inside an expression
ui.stylesheet({ Root: { '@!card/>=400px': { $style: { opacity: 0 } } } })
// The declared literal keys are accepted.
ui.stylesheet({
  Root: {
    '@>=600px': { $style: { opacity: 0 } },
    '@!card/>=300px': { $style: { opacity: 1 } },
  },
})

// A system that declares no widths accepts none.
const bare = defineSystem({ id: 'no-widths-types', tokens: {} })
// @ts-expect-error this system declares no widths
bare.q.media(dp(600))

const namedFixed = defineSystem({
  id: 'named-fixed-keys',
  tokens: {},
  conditions: {
    containers: { card: { wide: dp(300) } },
    widths: { containers: { card: [400] } },
  },
})
namedFixed.stylesheet((q) => ({
  Root: {
    [q.container('card', dp(400))]: { $style: { opacity: 0 } },
    '@container card wide': { $style: { opacity: 1 } },
  },
}))
