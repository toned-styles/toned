/**
 * `useStyles` and `createElements` for React Server Components.
 *
 * A Server Component has no hooks and no context, so these resolve through a
 * registered renderer instead (see `registerRenderer`). The result has the
 * same shape as on the client: class names and inline style to spread, with
 * `with()` for extra host props. Nothing is interactive here; states declared
 * in the stylesheet apply through the built CSS.
 */
import {
  getStylesheetPlan,
  stylesheetVariantAxes,
} from '@toned/core/stylesheet'
import {
  cloneElement,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'

import { type ResolveSheet, rendererFor } from './server-registry.ts'

type Bag = Record<string, unknown>

export function useStyles(
  sheet: object,
  variants?: object,
): Record<string, Bag> {
  const renderer = rendererFor(sheet)
  const resolved = (renderer.resolve as ResolveSheet).call(
    renderer,
    sheet,
    variants ? { variants } : undefined,
  )
  const out: Record<string, Bag> = {}
  for (const part of Object.keys(resolved))
    out[part] = withHostProps(resolved[part] ?? {})
  return out
}

/**
 * A part's props with `with()` on them. The client's version also composes a
 * ref and interaction handlers; a Server Component may pass neither to a host,
 * so here it merges class names and style and passes the rest through.
 */
function withHostProps(bag: object): Bag {
  const { ref: _ref, ...props } = bag as Bag
  const merge = (extra: Bag | false | null | undefined): Bag => {
    if (!extra) return withHostProps(props)
    const merged: Bag = { ...props }
    for (const key in extra) {
      const value = extra[key]
      if (value == null) continue
      if (key[0] === '$')
        throw new Error(
          `[toned] with() takes host props, and "${key}" is a stylesheet key. Pass "style" for an inline value, or declare it in the stylesheet.`,
        )
      if (key === 'className')
        merged[key] = merged[key] ? `${merged[key]} ${value}` : value
      else if (key === 'style')
        merged[key] = { ...(merged[key] as object), ...(value as object) }
      else merged[key] = value
    }
    return withHostProps(merged)
  }
  for (const name of ['with', 'withProps'])
    Object.defineProperty(props, name, { value: merge, enumerable: false })
  return props
}

/** The default web element for each `$kind`, as the web host resolves it. */
const ELEMENT_BY_KIND: Record<string, string> = {
  view: 'div',
  text: 'span',
  image: 'img',
  pressable: 'button',
}

/** Carries the family's variants from its provider to a part. Never reaches a host. */
const VARIANTS = '$tonedVariants'

export function createElements(sheet: object) {
  const plan = getStylesheetPlan(sheet)
  const axes = stylesheetVariantAxes(sheet)
  for (const axis of axes)
    if (['children', 'key', 'ref'].includes(axis))
      throw new Error(
        `Toned createElements: variant axis "${axis}" conflicts with React props; rename this axis or use useStyles`,
      )
  const parts = new Set<unknown>()

  /**
   * Without context, the family hands its variants to its parts directly: it
   * walks the elements written inside it and passes them to each part it
   * finds. A nested family of the same sheet keeps its own subtree.
   */
  function give(node: ReactNode, variants: object): ReactNode {
    if (Array.isArray(node)) return node.map((child) => give(child, variants))
    if (!isValidElement(node)) return node
    const element = node as ReactElement<{ children?: ReactNode }>
    if (element.type === Elements) return element
    const children = element.props.children
    const given = children === undefined ? undefined : give(children, variants)
    if (parts.has(element.type))
      return cloneElement(
        element,
        { [VARIANTS]: variants } as object,
        ...(given === undefined ? [] : [given]),
      )
    return given === undefined || given === children
      ? element
      : cloneElement(element, undefined, given)
  }

  function Elements({
    children,
    ...variants
  }: { children?: ReactNode } & Record<string, unknown>) {
    return give(children, variants)
  }
  Elements.displayName = 'TonedElements'

  for (const part of plan.parts) {
    if (
      part in Elements ||
      ['$$typeof', 'render', 'defaultProps', 'propTypes'].includes(part)
    )
      throw new Error(
        `Toned createElements: part "${part}" conflicts with component metadata; rename this part or use useStyles`,
      )
    const rule = plan.rules[part] as
      | { $kind?: string; $$type?: string }
      | undefined
    const kind = rule?.$kind ?? rule?.$$type ?? 'view'

    function Element({
      as,
      [VARIANTS]: variants,
      ...props
    }: Record<string, unknown>) {
      if (variants === undefined && axes.length)
        throw new Error(
          `[toned] <${part}> was rendered in a Server Component without its family's variants. A family passes them to the parts written inside it; a part rendered by another component is out of its reach. Render the part inside the family's own JSX, use useStyles, or mark the component "use client".`,
        )
      const bag = useStyles(sheet, variants as object | undefined)[part] as {
        with(props: object): object
      }
      return createElement(
        (as as string | undefined) ?? ELEMENT_BY_KIND[kind] ?? 'div',
        bag.with(props),
      )
    }
    Element.displayName = `TonedElements.${part}`
    parts.add(Element)
    Object.defineProperty(Elements, part, { value: Element, enumerable: true })
  }
  return Elements
}
