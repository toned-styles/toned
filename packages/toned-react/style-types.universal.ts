/**
 * Tunes the `style` escape hatch to the CROSS-PLATFORM vocabulary — the
 * curated intersection of React DOM's CSSProperties and React Native's style
 * props, restricted to values both understand.
 *
 *   import type {} from '@toned/react/style-types.universal'
 *
 * Curated structurally rather than derived: this package does not depend on
 * react-native's types, and an automatic intersection would be wrong anyway
 * (the platforms share property NAMES whose accepted values differ — e.g.
 * numeric-only dimensions on native). Web-only styling belongs in an
 * `'@platform.web'` block, where the web type applies in full.
 */
import type { CSSProperties } from 'react'

type Dimension = number | `${number}%`

/** The style properties both React DOM and React Native accept, with the value
 * shapes valid on BOTH. */
export interface UniversalInlineStyle {
  // Layout (Yoga ∩ CSS flexbox)
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around'
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  aspectRatio?: number | string
  bottom?: Dimension
  columnGap?: number
  display?: 'flex' | 'none'
  flex?: number
  flexBasis?: Dimension | 'auto'
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse'
  flexGrow?: number
  flexShrink?: number
  flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  gap?: number
  height?: Dimension | 'auto'
  justifyContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
  left?: Dimension
  margin?: Dimension | 'auto'
  marginBottom?: Dimension | 'auto'
  marginLeft?: Dimension | 'auto'
  marginRight?: Dimension | 'auto'
  marginTop?: Dimension | 'auto'
  maxHeight?: Dimension
  maxWidth?: Dimension
  minHeight?: Dimension
  minWidth?: Dimension
  overflow?: 'visible' | 'hidden'
  padding?: Dimension
  paddingBottom?: Dimension
  paddingLeft?: Dimension
  paddingRight?: Dimension
  paddingTop?: Dimension
  position?: 'absolute' | 'relative'
  right?: Dimension
  rowGap?: number
  top?: Dimension
  width?: Dimension | 'auto'
  zIndex?: number

  // Paint (colour strings resolve on both; gradients and images do not)
  backgroundColor?: string
  borderBottomColor?: string
  borderBottomLeftRadius?: number
  borderBottomRightRadius?: number
  borderBottomWidth?: number
  borderColor?: string
  borderLeftColor?: string
  borderLeftWidth?: number
  borderRadius?: number
  borderRightColor?: string
  borderRightWidth?: number
  borderStyle?: 'solid' | 'dotted' | 'dashed'
  borderTopColor?: string
  borderTopLeftRadius?: number
  borderTopRightRadius?: number
  borderTopWidth?: number
  borderWidth?: number
  opacity?: number

  // Text (valid on Text/TextInput natively; harmless inheritance on web)
  color?: string
  fontFamily?: string
  fontSize?: number
  fontStyle?: 'normal' | 'italic'
  fontWeight?:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900'
  letterSpacing?: number
  lineHeight?: number
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify'
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through'
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

// Sanity: every universal property must be a legal web property name.
type AssertWebSubset = keyof UniversalInlineStyle extends keyof CSSProperties ? true : never
declare const _assertWebSubset: AssertWebSubset

declare module '@toned/core/registry' {
  interface TonedTypeRegistry {
    inlineStyle: UniversalInlineStyle
  }
}
