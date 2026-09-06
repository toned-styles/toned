import { createContext } from 'react'

/**
 * Measured inline sizes (px) of the container roots above this point of the
 * tree, by container name — the RUNTIME carrier of the `@container` lookup.
 *
 * An element that declares `container: '<name>'` provides its own measured
 * width under that name, merged over the inherited map — so a NESTED container
 * of the same name shadows the outer one, exactly as css answers the nearest
 * ancestor container. Every descendant sheet holding `'@<name>/<step>'` keys
 * resolves its condition mods against this map (see Base.containerState).
 *
 * Web css mode never reads it: there the generated `@container` toggles carry
 * the same lookup with no JS.
 */
export const ContainerSizesContext = createContext<Record<string, number>>({})
