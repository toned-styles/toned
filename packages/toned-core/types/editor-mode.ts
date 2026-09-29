/**
 * Editor mode: whether the type-only vocabularies that exist for EDITOR
 * COMPLETIONS are built. Diagnostics never depend on it — validation is the
 * same in both modes — so a batch check can skip the completion shapes.
 *
 * The switch is the difference between the two ways a program sees Toned:
 *
 * - An editor's language service (TS 7's `tsc --lsp`, the JS `tsserver`, and
 *   the `typescript/unstable` API built on the same project system) loads a
 *   referenced project's SOURCE in place of its declarations. Here
 *   `EditorModeProbe['mode']` is `true`: editor mode is ON.
 * - `tsc` / `tsc -b` compiles a consumer against the referenced project's
 *   emitted `.d.ts`. Declaration emit writes a private member without its
 *   type (`private readonly on;`), which reads as `any`: editor mode is OFF.
 *   A published package is consumed through its declarations too.
 *
 * So a CI or `pnpm typecheck` run pays for no completion shapes, and an
 * editor gets them without any configuration. A program that compiles
 * Toned's own sources directly (Toned's own packages, or a project that maps
 * `@toned/core` to source without a project reference) is in editor mode.
 */
export declare class EditorModeProbe {
  private readonly on: true
  readonly mode: EditorModeProbe['on']
}

/** `true` when a program sees Toned's sources (an editor), `false` through its declarations. */
export type EditorMode = 0 extends 1 & EditorModeProbe['mode'] ? false : true

/** `On` in editor mode, `Off` in a batch check. Only for completion vocabulary. */
export type EditorOnly<On, Off> = EditorMode extends true ? On : Off
