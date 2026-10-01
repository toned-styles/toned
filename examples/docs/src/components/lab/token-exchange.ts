import { exportDtcg, importDtcg } from '@toned/compiler/tokens'

export const initialDocument = JSON.stringify(
  {
    space: {
      small: { $type: 'dimension', $value: { value: 8, unit: 'px' } },
      card: { $type: 'dimension', $value: '{space.small}' },
    },
  },
  null,
  2,
)

/** Import a DTCG document, then export it again from the resolved library. */
export function exchangeTokens(source: string) {
  try {
    const document: unknown = JSON.parse(source)
    const library = importDtcg(document)
    return { library, exported: exportDtcg(library), error: '' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}
