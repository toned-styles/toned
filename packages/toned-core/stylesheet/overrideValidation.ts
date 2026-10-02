/** Override layers change styling; a part's host kind belongs to its base sheet. */
export function assertOverrideMetadata(
  input: unknown,
  parts: ReadonlySet<string>,
): void {
  const walk = (node: unknown, level: 'root' | 'part'): void => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    for (const [key, value] of Object.entries(node)) {
      if (key === '$kind' || key === '$$type')
        throw new Error(
          'Toned: overrides cannot declare or remove static part kind metadata',
        )
      if (level === 'root') {
        if (key === '$compose') continue
        const condition =
          key.startsWith('@') ||
          key.startsWith('[') ||
          key.startsWith('$named$_') ||
          key.includes(':')
        walk(value, condition ? 'root' : 'part')
      } else if (
        key.startsWith('@') ||
        key.includes(':') ||
        key.startsWith('[') ||
        parts.has(key.replace(/^\$/, ''))
      ) {
        walk(value, 'part')
      }
    }
  }
  walk(input, 'root')
}
