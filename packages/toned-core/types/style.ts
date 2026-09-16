import type { Properties } from 'csstype'
import type { Platform } from './config.ts'
import type { ElementType } from './tokens.ts'

type Dimension = number | `${number}%`

export interface PortableInlineStyle {
  // Layout (Yoga ∩ CSS flexbox)
  alignContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'stretch'
    | 'space-between'
    | 'space-around'
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  alignSelf?:
    | 'auto'
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'stretch'
    | 'baseline'
  aspectRatio?: number
  bottom?: Dimension
  columnGap?: number
  display?: 'flex' | 'none'
  // Use flexGrow/flexShrink/flexBasis: numeric shorthand semantics differ.
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
  // lineHeight is intentionally platform-specific (CSS ratio vs native dp).
  textAlign?: 'left' | 'right' | 'center' | 'justify'
  textDecorationLine?:
    | 'none'
    | 'underline'
    | 'line-through'
    | 'underline line-through'
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

type TextKeys =
  | 'color'
  | 'fontFamily'
  | 'fontSize'
  | 'fontStyle'
  | 'fontWeight'
  | 'letterSpacing'
  | 'lineHeight'
  | 'textAlign'
  | 'textDecorationLine'
  | 'textTransform'
type ForKind<T, Kind> = Kind extends 'text'
  ? T
  : Omit<T, TextKeys> & { [K in TextKeys]?: never }
export type WebInlineStyle = Properties<number | string> & {
  [K in `--${string}`]?: string | number
}
export type NativeInlineStyle<Kind> = ForKind<
  Omit<PortableInlineStyle, 'textAlign'>,
  Kind
> & {
  flex?: number
  paddingHorizontal?: number
  paddingVertical?: number
  marginHorizontal?: number
  marginVertical?: number
  elevation?: number
  shadowColor?: string
  shadowOffset?: { width: number; height: number }
  shadowOpacity?: number
  shadowRadius?: number
  transform?: readonly Record<string, number | string>[]
} & (Kind extends 'text'
    ? {
        textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify'
        lineHeight?: number
        includeFontPadding?: boolean
        textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center'
      }
    : {}) &
  (Kind extends 'image'
    ? {
        resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
        tintColor?: string
      }
    : {})
/** The portable escape is always checked, independently of the active host.
 * Host gates widen property/value vocabulary without losing the part kind. */
export type PlatformStyle<
  Kind extends ElementType | undefined,
  Host extends Platform | undefined,
> = Host extends 'web'
  ? WebInlineStyle
  : Host extends 'native'
    ? NativeInlineStyle<Kind>
    : ForKind<PortableInlineStyle, Kind>
