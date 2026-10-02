import { getStylesheetPlan } from '@toned/core/stylesheet'

/** What a Server Component needs from a renderer: its system, and `resolve`. */
export type ServerRenderer = {
  readonly system: object
  // Each renderer types `resolve` by its own system; any of them is accepted.
  resolve(sheet: never, ...input: never[]): unknown
}

/** `resolve` as the server entry calls it, whatever system the renderer has. */
export type ResolveSheet = (
  sheet: object,
  input?: { variants?: object },
) => Record<string, object>

// Server Components have no context, so the renderer for a system is found
// here instead. A renderer is static (a system and its build manifest), so
// one registration serves every request.
const renderers = new Map<object, ServerRenderer>()

/**
 * Make a renderer available to `useStyles` and `createElements` in React
 * Server Components. Call it once, where the renderer is created:
 *
 * ```ts
 * export const renderer = createWebRenderer(ui, { manifest })
 * registerRenderer(renderer)
 * ```
 *
 * Client components still read their renderer from `TonedProvider`.
 */
export function registerRenderer<R extends ServerRenderer>(renderer: R): R {
  renderers.set(renderer.system, renderer)
  return renderer
}

/** The renderer registered for the system `sheet` belongs to. */
export function rendererFor(sheet: object): ServerRenderer {
  const renderer = renderers.get(getStylesheetPlan(sheet).ref)
  if (!renderer)
    throw new Error(
      '[toned] No renderer is registered for this stylesheet in a Server Component. Call registerRenderer(renderer) from @toned/react where the renderer is created, or mark the component "use client" to read it from TonedProvider.',
    )
  return renderer
}
