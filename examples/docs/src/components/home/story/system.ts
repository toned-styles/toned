import { defineSystem, defineToken } from '@toned/core'

const colours = {
  info: { soft: '#eef2ff', line: '#bac8ff', solid: '#284bdd' },
  success: { soft: '#eaf6ef', line: '#cde9d8', solid: '#1d7a4c' },
  danger: { soft: '#fdecea', line: '#f3c9c4', solid: '#b3261e' },
} as const

const shapes = {
  card: { padding: 20, borderRadius: 12 },
  compact: { padding: 12, borderRadius: 12 },
  pill: { padding: '2px 10px', borderRadius: 999 },
} as const

const text = {
  title: { fontSize: 18, fontWeight: 600, color: '#17234b' },
  body: { fontSize: 15, fontWeight: 400, color: '#34405f' },
  label: { fontSize: 12, fontWeight: 600, color: '#ffffff' },
} as const

type Tone = keyof typeof colours

// A token is one design decision: its name, the values it allows, and what
// each value means. A stylesheet can use these values and nothing else.
export const ui = defineSystem({
  id: 'notice',
  tokens: {
    tint: defineToken({
      values: ['info', 'success', 'danger'],
      resolve: (tone: Tone) => ({
        backgroundColor: colours[tone].soft,
        borderColor: colours[tone].line,
        borderWidth: 1,
        borderStyle: 'solid',
      }),
    }),
    fill: defineToken({
      values: ['info', 'success', 'danger'],
      resolve: (tone: Tone) => ({ backgroundColor: colours[tone].solid }),
    }),
    shape: defineToken({
      values: ['card', 'compact', 'pill'],
      resolve: (shape: keyof typeof shapes) => shapes[shape],
    }),
    text: defineToken({
      values: ['title', 'body', 'label'],
      resolve: (style: keyof typeof text) => text[style],
    }),
    stack: defineToken({
      values: [4, 8] as const,
      resolve: (gap) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap,
      }),
    }),
  },
})

export const { stylesheet } = ui
