// Three stand-in targets: one accepts anything, one is narrower in its type,
// one refuses at runtime (the `bad` stand-in, and a stylesheet's loud tone).
const nameOf = (sheet: object) =>
  'name' in sheet ? String(sheet.name) : 'a stylesheet'

export const targets = {
  loose: (sheet: object, _options?: unknown) => nameOf(sheet),
  strict: (sheet: { name: 'ok' }) => sheet.name,
  throws: (sheet: object, options?: { variants?: { tone?: string } }) => {
    if (nameOf(sheet) === 'bad') throw new Error('bad is not supported here')
    if (options?.variants?.tone === 'loud')
      throw new Error('loud is not supported here')
    return nameOf(sheet)
  },
}
