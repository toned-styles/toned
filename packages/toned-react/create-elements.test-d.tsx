/** Compile-time contracts; tsc verifies each expected rejection. */
import { defineSystem, defineToken } from '@toned/core'
import { createRef, forwardRef } from 'react'
import { createElements } from './index.ts'

const system = defineSystem({
  id: 'element-family-types',
  tokens: {
    tone: defineToken({
      values: ['neutral', 'accent'] as const,
      resolve: (value) => ({ opacity: value === 'accent' ? 1 : 0.5 }),
    }),
  },
})

const plain = system.stylesheet({
  Container: { $kind: 'pressable', tone: 'neutral' },
  Label: { $kind: 'text' },
})
const Plain = createElements(plain)
const Sized = createElements(
  plain.variants<{ size: 's' | 'l'; variant: 'neutral' | 'accent' }>()(($) => ({
    [$.variant('accent')]: { Container: { tone: 'accent' } },
  })),
)
const Defaulted = createElements(
  plain.variants<{ size: 's' | 'l'; variant: 'neutral' | 'accent' }>()(
    ($) => ({ [$.variant('accent')]: { Container: { tone: 'accent' } } }),
    { defaults: { size: 's' } },
  ),
)
const AllDefaulted = createElements(
  plain.variants<{ size: 's' | 'l' }>()(
    ($) => ({ [$.size('l')]: { Container: { tone: 'accent' } } }),
    { defaults: { size: 's' } },
  ),
)

export function FamilyContracts() {
  // Standalone parts are valid even if the scoped API requires variant inputs.
  const standalone = <Sized.Label />
  const base = (
    <Plain>
      <Plain.Container />
      <Plain.Label />
    </Plain>
  )
  const scoped = (
    <Sized size="s" variant="accent">
      <Sized.Label />
    </Sized>
  )
  const defaulted = (
    <Defaulted variant="neutral">
      <Defaulted.Label />
    </Defaulted>
  )
  const undefinedDefault = <Defaulted size={undefined} variant="accent" />
  const allDefaulted = (
    <AllDefaulted>
      <AllDefaulted.Label />
    </AllDefaulted>
  )
  const keyed = <Sized key="first" size="l" variant="neutral" />

  // @ts-expect-error the stylesheet declares no such part
  const unknownPart = <Plain.Missing />
  const missingVariants = (
    // @ts-expect-error a provider with required axes cannot omit them
    <Sized>
      <Sized.Label />
    </Sized>
  )
  // @ts-expect-error one required axis is still missing
  const missingVariant = <Sized size="s" />
  // @ts-expect-error defaults make only the defaulted axes optional
  const missingNondefaulted = <Defaulted />
  // @ts-expect-error variant values retain their literal union
  const badSize = <Sized size="xl" variant="neutral" />
  // @ts-expect-error default values do not widen variant unions
  const badDefaultedSize = <Defaulted size="xl" variant="neutral" />
  // @ts-expect-error unknown axes are not forwarded as host props
  const unknownAxis = <Sized size="s" variant="accent" loading />
  // @ts-expect-error a provider has no DOM host
  const hostProps = <Plain className="outer" />
  // @ts-expect-error the provider cannot select a host element
  const providerAs = <Plain as="button" />
  const providerOverrides = (
    // @ts-expect-error overrides belong to StyleOverrides, not provider props
    <Plain overrides={{ Container: { tone: 'accent' } }} />
  )
  // @ts-expect-error new parts are components, not mutable prop bags
  Plain.Container.with({ className: 'outer' })
  // @ts-expect-error the family does not expose a hook's prop snapshot
  Plain.$props

  return [
    standalone,
    base,
    scoped,
    defaulted,
    undefinedDefault,
    allDefaulted,
    keyed,
    unknownPart,
    missingVariants,
    missingVariant,
    missingNondefaulted,
    badSize,
    badDefaultedSize,
    unknownAxis,
    hostProps,
    providerAs,
    providerOverrides,
  ]
}

const NeedsValue = forwardRef<
  HTMLButtonElement,
  { value: number; className?: string }
>(({ value, className }, ref) => (
  <button type="button" ref={ref} className={className}>
    {value}
  </button>
))

export function HostContracts() {
  const buttonRef = createRef<HTMLButtonElement>()
  const inputRef = createRef<HTMLInputElement>()
  const button = (
    <Plain.Container as="button" type="submit" disabled ref={buttonRef} />
  )
  const input = <Plain.Container as="input" value="text" ref={inputRef} />
  const custom = <Plain.Container as={NeedsValue} value={1} ref={buttonRef} />
  const label = <Plain.Label as="label" htmlFor="field" />

  // @ts-expect-error button props do not accept href
  const badButton = <Plain.Container as="button" href="/nope" />
  // @ts-expect-error button type is a finite HTML union
  const badButtonType = <Plain.Container as="button" type="arbitrary" />
  // @ts-expect-error custom component required props remain required
  const missingCustomProp = <Plain.Container as={NeedsValue} />
  // @ts-expect-error the selected custom component decides prop types
  const badCustomProp = <Plain.Container as={NeedsValue} value="one" />
  // @ts-expect-error refs target the selected intrinsic host
  const wrongRef = <Plain.Container as="button" ref={inputRef} />
  const wrongCustomRef = (
    // @ts-expect-error refs target the selected custom component
    <Plain.Container as={NeedsValue} value={1} ref={inputRef} />
  )

  return [
    button,
    input,
    custom,
    label,
    badButton,
    badButtonType,
    missingCustomProp,
    badCustomProp,
    wrongRef,
    wrongCustomRef,
  ]
}

export function ReservedNameContracts() {
  const childrenAxis = plain.variants<{ children: 's' | 'l' }>()(($) => ({
    [$.children('s')]: { Container: { tone: 'accent' } },
  }))
  const keyAxis = plain.variants<{ key: 's' | 'l' }>()(($) => ({
    [$.key('s')]: { Container: { tone: 'accent' } },
  }))
  const refAxis = plain.variants<{ ref: 's' | 'l' }>()(($) => ({
    [$.ref('s')]: { Container: { tone: 'accent' } },
  }))
  // @ts-expect-error children must retain React's provider-content meaning
  createElements(childrenAxis)
  // @ts-expect-error React consumes key instead of passing it as a variant input
  createElements(keyAxis)
  // @ts-expect-error ref has React component semantics, not variant semantics
  createElements(refAxis)

  // @ts-expect-error a part cannot replace the provider function's built-in name
  createElements(system.stylesheet({ name: {} }))
  // @ts-expect-error a part cannot replace an inherited function operation
  createElements(system.stylesheet({ bind: {} }))
  // @ts-expect-error functions also inherit the Object prototype's constructor
  createElements(system.stylesheet({ constructor: {} }))
  // @ts-expect-error inherited Object operations are present on the provider
  createElements(system.stylesheet({ hasOwnProperty: {} }))
  // @ts-expect-error inherited Object operations are present on the provider
  createElements(system.stylesheet({ isPrototypeOf: {} }))
  // @ts-expect-error inherited Object operations are present on the provider
  createElements(system.stylesheet({ propertyIsEnumerable: {} }))
  // @ts-expect-error inherited Object operations are present on the provider
  createElements(system.stylesheet({ toLocaleString: {} }))
  // @ts-expect-error inherited Object operations are present on the provider
  createElements(system.stylesheet({ valueOf: {} }))
  // @ts-expect-error the computed spelling is a real own part, not object-literal prototype syntax
  createElements(system.stylesheet({ ['__proto__']: {} }))
  // @ts-expect-error legacy Object prototype methods also collide at runtime
  createElements(system.stylesheet({ __defineGetter__: {} }))
  // @ts-expect-error legacy Object prototype methods also collide at runtime
  createElements(system.stylesheet({ __defineSetter__: {} }))
  // @ts-expect-error legacy Object prototype methods also collide at runtime
  createElements(system.stylesheet({ __lookupGetter__: {} }))
  // @ts-expect-error legacy Object prototype methods also collide at runtime
  createElements(system.stylesheet({ __lookupSetter__: {} }))
  // These are not runtime collisions: ordinary JSX props are valid PART names.
  createElements(system.stylesheet({ children: {}, key: {}, ref: {} }))
  // @ts-expect-error displayName names the provider component itself
  createElements(system.stylesheet({ displayName: {} }))
  // @ts-expect-error React reserves render as component metadata
  createElements(system.stylesheet({ render: {} }))
  // @ts-expect-error React reserves defaultProps as component metadata
  createElements(system.stylesheet({ defaultProps: {} }))
  // @ts-expect-error React reserves propTypes as component metadata
  createElements(system.stylesheet({ propTypes: {} }))
}
