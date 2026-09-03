/**
 * Host-tunable type slots, filled by declaration merging.
 *
 * This interface lives in its OWN module on purpose: TypeScript merges
 * interface augmentations at the module that DECLARES the interface, and a
 * re-export does not carry that — `declare module '@toned/core'` against a
 * re-exported interface would declare a new, unrelated one. Augment THIS
 * module:
 *
 *   declare module '@toned/core/registry' {
 *     interface TonedTypeRegistry { inlineStyle: MyStyleType }
 *   }
 *
 * or import one of the shipped tuning modules, which do exactly that:
 *
 *   import type {} from '@toned/react/style-types.web'        // CSSProperties
 *   import type {} from '@toned/react/style-types.universal'  // web ∩ native
 *
 * Unaugmented, the `style` escape hatch stays `any` — exactly as before.
 *
 * @module registry
 */

// biome-ignore lint/suspicious/noEmptyInterface: filled by host declaration merging
export interface TonedTypeRegistry {}
