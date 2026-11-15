import { isTransform, writeStyle } from '../motion/channels.ts'
/**
 * System animations: validation, the static frame each reduced-motion mode
 * rests on, and the CSS the build emits for them.
 *
 * Reduced-motion behaviour belongs to the animation, not to each part that
 * uses it, so it is attached to the KEYFRAMES NAME, which every spelling of
 * the animation carries: a class, an inline value written under a condition,
 * a rule parameter. Under `prefers-reduced-motion: reduce` the build
 * redefines each animation's keyframes by its mode:
 *
 * - `'none'`: empty keyframes, so the element shows its own style;
 * - `'end'` and `{ at }`: one frame for the whole timeline, read from the
 *   keyframes;
 * - `'keep'`: not redefined.
 *
 * A part that overrides the mode (`reducedMotion: 'keep'` beside
 * `animation: 'pulse'`) is folded at normalisation into the animation token
 * value `pulse~keep`, whose name reads a variable only reduced motion sets:
 * `animation-name: var(--toned_rm-pulse--keep, toned_pulse)`. Outside reduced
 * motion the authored keyframes play; under it the variant does. Every
 * variant comes from the system declaration, so the build stays pure.
 *
 * @module system/animations
 */
import type {
  AnimationDefinition,
  AnimationInput,
  AnimationKeyframes,
  ReducedMotion,
} from '../types/tokens.ts'
import { isAnimationDefinition } from '../types/tokens.ts'
import { serializeCssValue } from '../utils/css-value.ts'
import { camelToKebab } from '../utils/css.ts'

/** The media condition toned owns for reduced motion. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** A frame: CSS (or portable motion) properties to values. */
export type AnimationFrame = Record<string, string | number>

/** Marks the tokens `defineAnimations` returns, so the system can find them. */
export type AnimationRole = 'animation' | 'reducedMotion'

const fail = (message: string): never => {
  throw new Error(`Toned: ${message}`)
}

/** `'from'`, `'to'` or `'<n>%'` as a number of percent. */
function parseOffset(selector: string, name: string): number {
  const text = selector.trim()
  if (text === 'from') return 0
  if (text === 'to') return 100
  const match = /^(\d+(?:\.\d+)?)%$/.exec(text)
  const value = match ? Number(match[1]) : NaN
  if (!(value >= 0 && value <= 100))
    fail(
      `animation '${name}' has keyframe selector '${selector}'; write from, to or a percentage from 0% to 100%`,
    )
  return value
}

/** Each keyframe block with the offsets its selector list names. */
function blocks(keyframes: AnimationKeyframes, name: string) {
  return Object.entries(keyframes).map(([selector, frame]) => ({
    offsets: selector.split(',').map((part) => parseOffset(part, name)),
    frame,
  }))
}

/** The offsets an animation's keyframes declare, ascending. */
export function keyframeOffsets(
  keyframes: AnimationKeyframes,
  name = 'animation',
): number[] {
  const set = new Set<number>()
  for (const block of blocks(keyframes, name))
    for (const offset of block.offsets) set.add(offset)
  return [...set].sort((a, b) => a - b)
}

const percent = (offset: number) => `${offset}%`

/** The offset the last iteration finishes on, by direction and count. */
function endOffset(definition: AnimationDefinition): number {
  const direction = definition.direction ?? 'normal'
  const count =
    definition.iterations === 'infinite' ? 1 : (definition.iterations ?? 1)
  // A fractional count ends part-way through its last iteration.
  const whole = Number.isInteger(count)
  const progress = whole ? 1 : count - Math.floor(count)
  const index = whole ? count - 1 : Math.floor(count)
  const reversed =
    direction === 'reverse' ||
    (direction === 'alternate' && index % 2 === 1) ||
    (direction === 'alternate-reverse' && index % 2 === 0)
  return (reversed ? 1 - progress : progress) * 100
}

/** The offset a resting mode rests on, or undefined for none and keep. */
function restingOffset(
  definition: AnimationDefinition,
  mode: ReducedMotion,
): number | undefined {
  if (mode === 'end') return endOffset(definition)
  if (typeof mode === 'object')
    return parseOffset(mode.at, 'animation') as number
  return undefined
}

/**
 * The frame an animation rests on under reduced motion, read from its
 * keyframes: `{}` for `'none'` (the element's own style), `undefined` for
 * `'keep'`. At an offset, every block whose selector names it contributes,
 * later blocks winning, as CSS merges them. A property the keyframes animate
 * but do not declare there is the element's own value at the ends; anywhere
 * else the browser would interpolate it, so it is refused.
 */
export function reducedMotionFrame(
  definition: AnimationDefinition,
  mode: ReducedMotion,
  name = 'animation',
): AnimationFrame | undefined {
  if (mode === 'keep') return undefined
  if (mode === 'none') return {}
  const offset = restingOffset(definition, mode)!
  const declared = keyframeOffsets(definition.keyframes, name)
  if (typeof mode === 'object' && !declared.includes(offset))
    fail(
      `animation '${name}' rests at ${mode.at}, which its keyframes do not declare; its offsets: ${declared.map(percent).join(', ')}`,
    )
  const frame: AnimationFrame = {}
  const animated = new Set<string>()
  for (const block of blocks(definition.keyframes, name)) {
    for (const property of Object.keys(block.frame)) animated.add(property)
    if (block.offsets.includes(offset)) Object.assign(frame, block.frame)
  }
  if (offset !== 0 && offset !== 100)
    for (const property of animated)
      if (!(property in frame))
        fail(
          `animation '${name}' rests at ${percent(offset)}, where ${property} is not declared but is animated elsewhere; declare ${property} at ${percent(offset)} or rest at another offset`,
        )
  return frame
}

/** A mode as a name fragment: `none`, `end`, `keep`, `at-50`. */
export function modeSlug(mode: ReducedMotion): string {
  return typeof mode === 'object'
    ? `at-${String(parseOffset(mode.at, 'animation')).replace('.', '_')}`
    : mode
}

const sameMode = (a: ReducedMotion, b: ReducedMotion) =>
  modeSlug(a) === modeSlug(b)

/** A mode as an author writes it, for messages. */
const describeMode = (mode: unknown) =>
  typeof mode === 'string'
    ? `'${mode}'`
    : isMode(mode) && typeof mode === 'object'
      ? `{ at: '${mode.at}' }`
      : JSON.stringify(mode)

const isMode = (value: unknown): value is ReducedMotion =>
  value === 'none' ||
  value === 'end' ||
  value === 'keep' ||
  (typeof value === 'object' &&
    value !== null &&
    Object.keys(value).length === 1 &&
    typeof (value as { at?: unknown }).at === 'string')

const MODES = "'none', 'end', { at: '<offset>%' } or 'keep'"

/**
 * The modes a part may override an animation's default with: every mode
 * whose frame the keyframes define, except the default itself.
 */
export function overrideModes(
  definition: AnimationDefinition,
  name: string,
): ReducedMotion[] {
  const candidates: ReducedMotion[] = [
    'none',
    'end',
    'keep',
    ...keyframeOffsets(definition.keyframes, name).map((offset) => ({
      at: percent(offset) as `${number}%`,
    })),
  ]
  return candidates.filter((mode) => {
    if (sameMode(mode, definition.reducedMotion)) return false
    try {
      reducedMotionFrame(definition, mode, name)
      return true
    } catch {
      // A frame the keyframes cannot define (an interpolated value) is not
      // offered; asking for it names why (foldReducedMotion).
      return false
    }
  })
}

/**
 * Checks every animation `defineAnimations` is given: a name the CSS can
 * carry, keyframes, and a reduced-motion mode whose frame its keyframes
 * define.
 */
export function validateAnimations(
  animations: Readonly<Record<string, unknown>>,
): asserts animations is Record<string, AnimationDefinition> {
  for (const [name, entry] of Object.entries(animations)) {
    if (name === 'none')
      fail("'none' cannot name an animation; animation: 'none' stops one")
    if (!/^[A-Za-z_][\w-]*$/.test(name) || name.includes('~'))
      fail(
        `animation name '${name}' must be a CSS identifier (letters, digits, '-' and '_')`,
      )
    const definition = entry as AnimationDefinition | undefined
    if (
      !definition ||
      !isAnimationDefinition(definition as AnimationInput) ||
      definition.reducedMotion === undefined
    )
      fail(`animation '${name}' has no reducedMotion; declare ${MODES}`)
    if (!isMode(definition!.reducedMotion))
      fail(
        `animation '${name}' has reducedMotion ${describeMode(definition!.reducedMotion)}; declare ${MODES}`,
      )
    reducedMotionFrame(definition!, definition!.reducedMotion, name)
  }
}

/** The keys a system gave its animation tokens, and its animations. */
export type AnimationTokens = {
  keys: { animation: string; reducedMotion: string }
  animations: Readonly<Record<string, AnimationDefinition>>
}

/**
 * Finds the `animation` and `reducedMotion` tokens `defineAnimations`
 * returned among a system's tokens, whatever keys the system gave them.
 */
export function animationTokens(
  tokens: Readonly<Record<string, unknown>> | undefined,
  animations: Readonly<Record<string, AnimationInput>> | undefined,
): AnimationTokens | undefined {
  if (!tokens || !animations) return undefined
  const keyOf = (role: AnimationRole) =>
    Object.keys(tokens).find(
      (key) =>
        (tokens[key] as { animationRole?: AnimationRole } | undefined)
          ?.animationRole === role,
    )
  const animation = keyOf('animation')
  const reducedMotion = keyOf('reducedMotion')
  return animation && reducedMotion
    ? {
        keys: { animation, reducedMotion },
        animations: animations as Record<string, AnimationDefinition>,
      }
    : undefined
}

/** The token value a part's override folds into: `pulse~keep`. */
export const overrideValue = (name: string, mode: ReducedMotion) =>
  `${name}~${modeSlug(mode)}`

/** The variable a folded override reads, and the variant it names. */
export const overrideVariable = (name: string, mode: ReducedMotion) =>
  `--toned_rm-${name}--${modeSlug(mode)}`
// `__`, not `--`: a `--` would read as a custom property when the CSS is
// namespaced (system/namespace.ts).
export const variantName = (name: string, mode: ReducedMotion) =>
  `toned_${name}__${modeSlug(mode)}`

/**
 * Folds a part's `reducedMotion` override into its `animation` value, in one
 * declaration block. The override needs its animation in the same block, so
 * that the variant is the one that animation declares.
 */
export function foldReducedMotion(
  block: Record<string, unknown>,
  keys: { animation: string; reducedMotion: string },
  animations: Readonly<Record<string, AnimationDefinition>>,
): Record<string, unknown> {
  if (!(keys.reducedMotion in block)) return block
  const { [keys.reducedMotion]: mode, ...rest } = block
  const name = block[keys.animation]
  if (!isMode(mode))
    fail(`reducedMotion ${describeMode(mode)} is not a mode; write ${MODES}`)
  if (typeof name !== 'string')
    fail(
      `reducedMotion ${describeMode(mode)} has no animation beside it; write it in the same block as animation: '<name>'`,
    )
  if (name === 'none') return rest
  const definition =
    animations[name as string] ??
    fail(`reducedMotion overrides an undeclared animation '${name}'`)
  if (sameMode(mode as ReducedMotion, definition.reducedMotion)) return rest
  // Names why a frame is unavailable, as the system-level check does.
  reducedMotionFrame(definition, mode as ReducedMotion, name as string)
  return {
    ...rest,
    [keys.animation]: overrideValue(name as string, mode as ReducedMotion),
  }
}

/**
 * A frame's properties as CSS declarations. The portable motion channels
 * compile to the CSS individual transforms motion itself writes on the web
 * (motion/channels.ts): `translateX`/`translateY` to one `translate` (pixels),
 * a numeric `rotate` to degrees, `scale` with `scaleX`/`scaleY` to `scale`.
 */
export function frameCss(frame: AnimationFrame): string {
  let css = ''
  const px = (value: string | number | undefined) =>
    value === undefined
      ? '0px'
      : typeof value === 'number'
        ? `${value}px`
        : value
  let translated = false
  let scaled = false
  for (const [property, value] of Object.entries(frame)) {
    if (property === 'translateX' || property === 'translateY') {
      if (translated) continue
      translated = true
      css += `translate:${px(frame['translateX'])} ${px(frame['translateY'])};`
    } else if ((property === 'scaleX' || property === 'scaleY') && !scaled) {
      scaled = true
      const base = Number(frame['scale'] ?? 1)
      css += `scale:${base * Number(frame['scaleX'] ?? 1)} ${base * Number(frame['scaleY'] ?? 1)};`
    } else if (property === 'scaleX' || property === 'scaleY') continue
    else if (property === 'scale' && ('scaleX' in frame || 'scaleY' in frame))
      continue
    else if (property === 'rotate' && typeof value === 'number')
      css += `rotate:${value}deg;`
    else
      css += `${camelToKebab(property)}:${serializeCssValue(property, value)};`
  }
  return css
}

const keyframesRule = (name: string, body: string) =>
  `@keyframes ${name} {${body}}`
const authored = (keyframes: AnimationKeyframes) =>
  Object.entries(keyframes)
    .map(([step, frame]) => `${step} {${frameCss(frame)}}`)
    .join('')
const resting = (frame: AnimationFrame | undefined, keyframes: string) =>
  frame === undefined
    ? keyframes
    : Object.keys(frame).length
      ? `0%, 100% {${frameCss(frame)}}`
      : ''

/**
 * The CSS for a system's animations, from the declaration alone: the
 * authored keyframes, then one reduced-motion block that redefines each by
 * its mode and defines the variants a part's override can name.
 */
export function animationCss(
  animations: Readonly<Record<string, AnimationInput>>,
  /** Whether a part can override a mode: the system registers the
   *  `reducedMotion` token. Without it no variant can be named, so none is
   *  emitted. */
  overrides = true,
): string {
  let styles = ''
  let reduced = ''
  let variables = ''
  for (const [name, entry] of Object.entries(animations)) {
    // A bare keyframes record (a declaration built without defineAnimations)
    // has no reduced-motion behaviour to emit.
    if (!isAnimationDefinition(entry)) {
      styles += keyframesRule(`toned_${name}`, authored(entry))
      continue
    }
    const body = authored(entry.keyframes)
    styles += keyframesRule(`toned_${name}`, body)
    if (entry.reducedMotion === undefined) continue
    // Under reduced motion each distinct body is defined once; a variant
    // whose body another name already has (the default's, or `at-100`
    // beside `end`) names that keyframes instead.
    const named = new Map<string, string>()
    if (entry.reducedMotion !== 'keep') {
      const own = resting(
        reducedMotionFrame(entry, entry.reducedMotion, name),
        body,
      )
      reduced += keyframesRule(`toned_${name}`, own)
      named.set(own, `toned_${name}`)
    }
    for (const mode of overrides ? overrideModes(entry, name) : []) {
      const variant = resting(reducedMotionFrame(entry, mode, name), body)
      let keyframes = named.get(variant)
      if (!keyframes) {
        keyframes = variantName(name, mode)
        named.set(variant, keyframes)
        reduced += keyframesRule(keyframes, variant)
      }
      variables += `${overrideVariable(name, mode)}: ${keyframes};`
    }
  }
  if (variables) reduced = `html {${variables}}${reduced}`
  return reduced
    ? `${styles}@media ${REDUCED_MOTION_QUERY} {${reduced}}`
    : styles
}

/** Milliseconds as CSS time; a string passes through. */
export const cssTime = (value: number | string | undefined) =>
  value === undefined
    ? undefined
    : typeof value === 'number'
      ? `${value}ms`
      : value

/**
 * A system animation as native plays it: the keyframes and the part's
 * resolved timing, in milliseconds. `@toned/core/motion`'s
 * `attachAnimation` plays it through the host writer.
 */
export type NativeAnimation = {
  readonly name: string
  readonly keyframes: AnimationKeyframes
  readonly duration: number
  readonly delay: number
  readonly easing: string
  readonly iterations: number
  readonly direction: NonNullable<AnimationDefinition['direction']>
  readonly fillMode: NonNullable<AnimationDefinition['fillMode']>
  /** The mode in force: the animation's own, or the part's override. */
  readonly reducedMotion: ReducedMotion
}

/** The CSS fields the animation tokens write, which native never receives. */
const ANIMATION_FIELDS = [
  'animationName',
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
] as const

// Resolved outputs are snapshots, which keep only their own enumerable
// fields; the animation a native output plays is kept beside it instead.
const played = new WeakMap<object, NativeAnimation>()

/** The animation a native part plays, from its resolved props. */
export const animationOf = (props: object): NativeAnimation | undefined =>
  played.get(props)

/** Records the animation a resolved native output plays. */
export function recordAnimation<T extends object>(
  props: T,
  animation: NativeAnimation | undefined,
): T {
  if (animation) played.set(props, animation)
  return props
}

/** `'400ms'`, `'1.5s'` or a number of milliseconds. */
function milliseconds(value: unknown, field: string): number {
  if (typeof value === 'number') return value
  const match = /^(-?\d*\.?\d+)(ms|s)$/.exec(String(value).trim())
  return match
    ? Number(match[1]) * (match[2] === 's' ? 1000 : 1)
    : fail(`${field} ${JSON.stringify(value)} is not a time native can play`)
}

const NAME = /^(?:[\w-]+?-)?toned_([\w-]+)$/
const OVERRIDE =
  /^var\(--(?:[\w-]+?-)?toned_rm-([\w-]+), (?:[\w-]+?-)?toned_([\w-]+)\)$/

/**
 * A frame as native style over the committed style: transform channels join
 * the committed `transform` list as motion writes them, other values are
 * written as declared.
 */
export function nativeFrameStyle(
  style: Readonly<Record<string, unknown>>,
  frame: AnimationFrame,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...style }
  const channels: Record<string, number[]> = {}
  for (const [property, value] of Object.entries(frame)) {
    if (isTransform(property)) channels[property] = [Number(value)]
    else out[property] = value
  }
  return writeStyle(out, channels, true)
}

/**
 * Lowers the animation tokens' CSS fields for native: they are removed, and
 * the animation is returned to play. Under reduced motion a resting mode's
 * frame is written instead, and nothing is left to play.
 */
export function lowerNativeAnimation(
  style: Readonly<Record<string, unknown>>,
  animations: Readonly<Record<string, AnimationInput>> | undefined,
  reducedMotion = false,
): { style: Record<string, unknown>; animation?: NativeAnimation } {
  if (!ANIMATION_FIELDS.some((field) => field in style))
    return { style: style as Record<string, unknown> }
  const rest: Record<string, unknown> = { ...style }
  for (const field of ANIMATION_FIELDS) delete rest[field]
  const written = String(style['animationName'] ?? 'none').trim()
  if (written === 'none') return { style: rest }
  const override = OVERRIDE.exec(written)
  const name = override ? override[2]! : NAME.exec(written)?.[1]
  const definition = name === undefined ? undefined : animations?.[name]
  if (!name || !definition || !isAnimationDefinition(definition))
    return fail(
      `native plays system animations only; animationName ${JSON.stringify(written)} names none of this system's animations`,
    )
  const slug = override?.[1]?.slice(name.length + 2)
  const mode =
    (slug &&
      overrideModes(definition, name).find((m) => modeSlug(m) === slug)) ||
    definition.reducedMotion
  const iterations =
    style['animationIterationCount'] ?? definition.iterations ?? 1
  const animation: NativeAnimation = Object.freeze({
    name,
    keyframes: definition.keyframes,
    duration: milliseconds(
      style['animationDuration'] ?? definition.duration ?? 0,
      'animationDuration',
    ),
    delay: milliseconds(
      style['animationDelay'] ?? definition.delay ?? 0,
      'animationDelay',
    ),
    easing: String(
      style['animationTimingFunction'] ?? definition.easing ?? 'ease',
    ),
    iterations: iterations === 'infinite' ? Infinity : Number(iterations),
    direction: (style['animationDirection'] ??
      definition.direction ??
      'normal') as NativeAnimation['direction'],
    fillMode: (style['animationFillMode'] ??
      definition.fillMode ??
      'none') as NativeAnimation['fillMode'],
    reducedMotion: mode,
  })
  if (reducedMotion && mode !== 'keep')
    return {
      style: nativeFrameStyle(
        rest,
        reducedMotionFrame(definition, mode, name)!,
      ),
    }
  return { style: rest, animation }
}
