import { defineSystem, defineToken } from '@toned/core'

// A token lists the values a stylesheet may use and what each one resolves to.
const token = <const Map extends Record<string, object>>(map: Map) =>
  defineToken({
    values: Object.keys(map) as Array<keyof Map & string>,
    resolve: (value: keyof Map) => map[value],
  })

const border = { borderWidth: 1, borderStyle: 'solid' } as const

export const ui = defineSystem({
  id: 'notice',
  tokens: {
    surface: token({
      info: { backgroundColor: '#eef2ff' },
      'info-solid': { backgroundColor: '#284bdd' },
      success: { backgroundColor: '#eaf6ef' },
      'success-solid': { backgroundColor: '#1d7a4c' },
      danger: { backgroundColor: '#fdecea' },
      'danger-solid': { backgroundColor: '#b3261e' },
    }),
    ink: token({
      strong: { color: '#17234b' },
      body: { color: '#34405f' },
      'on-solid': { color: '#ffffff' },
    }),
    edge: token({
      info: { ...border, borderColor: '#bac8ff' },
      success: { ...border, borderColor: '#cde9d8' },
      danger: { ...border, borderColor: '#f3c9c4' },
    }),
    inset: token({
      card: { padding: 20 },
      'card-compact': { padding: 12 },
      badge: { padding: '2px 10px' },
    }),
    type: token({
      title: { fontSize: 18, fontWeight: 600 },
      body: { fontSize: 15, fontWeight: 400 },
      label: { fontSize: 12, fontWeight: 600 },
    }),
    corner: defineToken({
      values: [12, 999] as const,
      resolve: (value) => ({ borderRadius: value }),
    }),
    stack: defineToken({
      values: [4, 8] as const,
      resolve: (value) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: value,
      }),
    }),
  },
})

export const { stylesheet } = ui
