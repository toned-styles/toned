/**
 * DOM style injection utilities.
 *
 * @module dom/inject
 */

import type { Breakpoints, TokenStyleDeclaration } from '../types/index.ts'
import { generate } from './generate.ts'

/**
 * Get or create a style element by ID.
 */
export function getStyleNodeById(id: string): HTMLStyleElement | null {
  if (typeof document === 'undefined') {
    // support virtual stylesheet
    return null
  }

  let node = document.getElementById(id) as HTMLStyleElement
  if (!node) {
    node = document.createElement('style')
    node.id = id
    document.head.appendChild(node)
  }
  return node
}

/**
 * Inject generated styles into the DOM.
 */
export function inject<
  const S extends
    | TokenStyleDeclaration
    | {
        // oxlint-disable-next-line typescript/no-explicit-any -- accepts any system's breakpoint key set
        breakpoints?: Breakpoints<any>
      },
>(system: S) {
  const sheet = getStyleNodeById('toned/main')

  if (!sheet) {
    return
  }

  const styles = generate(system as TokenStyleDeclaration)

  sheet.textContent = styles
}
