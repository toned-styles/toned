// Three stand-in targets: one accepts anything, one is narrower in its type,
// one refuses at runtime.
export const targets = {
  loose: (sheet: { name: string }) => sheet.name,
  strict: (sheet: { name: 'ok' }) => sheet.name,
  throws: (sheet: { name: string }) => {
    if (sheet.name === 'bad') throw new Error('bad is not supported here')
    return sheet.name
  },
}
