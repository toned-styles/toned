/**
 * Motion conformance: colour, transform and state-keyed motion, each declared
 * with `defineMotion` against a system that declares one target, attached to
 * a host of that target and stepped with a test clock.
 *
 * `works` means the painted value at the probe time is the expected
 * interpolation (so a state-keyed cell proves the state chose its
 * transition). Email and PDF have no host to animate: where the system
 * declares only that target, `defineMotion` should be a type error.
 *
 * The web host here is a small stand-in for a DOM element (inline style,
 * classes, computed style from rules, `matches` for attribute states), so the
 * scorecard runs under plain Bun; the motion package's own tests run the same
 * paths in happy-dom.
 */
import { fileURLToPath } from 'node:url'

import {
  attachMotion,
  createTestClock,
  defineMotion,
  type MotionDeclaration,
} from '../../motion/index.ts'
import { recordHostCommit, setStyles } from '../../stylesheet/applyStyles.ts'
import {
  type NativeHostAdapter,
  registerNativeHost,
} from '../../stylesheet/native-host.ts'
import { camelToKebab } from '../../utils/css.ts'
import { systems } from './declared.ts'
import { buildMatrix, type Feature } from './matrix.ts'

type Style = Record<string, unknown>
/** One committed change, per platform, and what is painted `at` ms later. */
export type Scenario = {
  facts?: readonly string[]
  at: number
  web: { from: Style; to: Style; read: string; expect: unknown }
  native: { from: Style; to: Style; read: string; expect: unknown }
}

export const features = {
  'motion-colour': {
    description: 'a colour transition, interpolated in Oklab',
    spec: {
      properties: ['backgroundColor'],
      transition: { type: 'timing', duration: 100 },
    },
    scenario: {
      at: 50,
      web: {
        from: { backgroundColor: '#000000' },
        to: { backgroundColor: '#ffffff' },
        read: 'backgroundColor',
        expect: 'rgba(99, 99, 99, 1)',
      },
      native: {
        from: { backgroundColor: '#000000' },
        to: { backgroundColor: '#ffffff' },
        read: 'backgroundColor',
        expect: 'rgba(99, 99, 99, 1)',
      },
    },
  },
  'motion-transform': {
    description: 'translate and scale as separate transform channels',
    spec: {
      properties: ['translateY', 'scale'],
      transition: { type: 'timing', duration: 100 },
    },
    scenario: {
      at: 50,
      web: {
        from: {},
        to: { translate: '0px 100px', scale: '2' },
        read: 'translate',
        expect: '0px 50px',
      },
      native: {
        from: {},
        to: { transform: [{ translateY: 100 }, { scale: 2 }] },
        read: 'transform',
        expect: [{ translateX: 0 }, { translateY: 50 }, { scale: 1.5 }],
      },
    },
  },
  'motion-state': {
    description: "a transition keyed by a declared state (`':open'`)",
    spec: {
      properties: ['opacity'],
      transition: { type: 'timing', duration: 100 },
      states: { ':open': { type: 'timing', duration: 400 } },
    },
    scenario: {
      facts: ['open'],
      at: 100,
      web: {
        from: { opacity: 0 },
        to: { opacity: 1 },
        read: 'opacity',
        expect: 0.25,
      },
      native: {
        from: { opacity: 0 },
        to: { opacity: 1 },
        read: 'opacity',
        expect: 0.25,
      },
    },
  },
} as const

type Name = keyof typeof systems

const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)
const check = (painted: unknown, expected: unknown, at: number) => {
  if (!equal(painted, expected))
    throw new Error(
      `painted ${JSON.stringify(painted)} at ${at} ms; expected ${JSON.stringify(expected)}`,
    )
}

/** Inline style with CSSOM-like reads, computed from inline over the rules. */
function webHost(facts: ReadonlySet<string>) {
  const style: Record<string, unknown> &
    Pick<
      CSSStyleDeclaration,
      'getPropertyValue' | 'setProperty' | 'removeProperty'
    > = {
    getPropertyValue: (name: string) =>
      String(
        style[name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] ??
          '',
      ),
    setProperty: (name: string, value: string | null) => {
      style[name] = value ?? ''
    },
    removeProperty: (name: string) => {
      delete style[name]
      return ''
    },
  } as never
  const classes = new Set<string>()
  let rules: Style = {}
  const element = {
    style,
    classList: {
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
      contains: (name: string) => classes.has(name),
    },
    matches: (selector: string) => {
      const name = /^\[data-state='(.+)'\]$/.exec(selector)?.[1]
      return name !== undefined && facts.has(name)
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle: () => ({
          getPropertyValue: (name: string) => {
            const inline = style.getPropertyValue(name)
            if (inline) return inline
            const key = Object.keys(rules).find((k) => camelToKebab(k) === name)
            return key ? String(rules[key]) : ''
          },
        }),
      },
    },
  }
  return {
    element,
    /** The generated CSS now in effect for the host. */
    css(next: Style) {
      rules = next
    },
  }
}

function runWeb(motion: MotionDeclaration, scenario: Scenario) {
  const clock = createTestClock()
  const f = webHost(new Set(scenario.facts ?? []))
  const owner = {}
  f.css(scenario.web.from)
  recordHostCommit(f.element, { className: 'from' }, {}, owner)
  setStyles(f.element, { className: 'from' }, owner)
  attachMotion(f.element, motion, { clock })
  f.css(scenario.web.to)
  setStyles(f.element, { className: 'to' }, owner)
  clock.advance(scenario.at)
  const painted = f.element.style.getPropertyValue(
    camelToKebab(scenario.web.read),
  )
  const expected = scenario.web.expect
  check(
    typeof expected === 'number' ? Number(painted) : painted,
    expected,
    scenario.at,
  )
  return painted
}

function runNative(motion: MotionDeclaration, scenario: Scenario) {
  const clock = createTestClock()
  const facts = new Set(scenario.facts ?? [])
  const painted: Style = { ...scenario.native.from }
  const host = {}
  const adapter: NativeHostAdapter = Object.freeze({
    id: 'toned-scorecard/motion',
    renderer: 'custom',
    version: '1',
    accepts: () => true,
    readState: (_host: object, name: string) => facts.has(name),
    patch: (_host: object, props: Style) =>
      Object.assign(painted, props['style']),
    resetStyle: () => null,
    resetProp: () => null,
  })
  registerNativeHost(host, adapter)
  const owner = {}
  recordHostCommit(host, { style: scenario.native.from }, {}, owner)
  setStyles(host, { style: scenario.native.from }, owner)
  attachMotion(host, motion, { clock })
  setStyles(host, { style: scenario.native.to }, owner)
  clock.advance(scenario.at)
  check(painted[scenario.native.read], scenario.native.expect, scenario.at)
  return painted[scenario.native.read]
}

const noHost = (target: string) => () => {
  throw new Error(
    `${target} renders one static style per part: there is no host to animate`,
  )
}

export const targets: Record<
  Name,
  (motion: MotionDeclaration, scenario: Scenario) => unknown
> = {
  web: runWeb,
  native: runNative,
  email: noHost('email'),
  pdf: noHost('pdf'),
}

const matrixFeatures: Record<string, Feature> = Object.fromEntries(
  Object.entries(features).map(([name, feature]) => [
    name,
    {
      description: feature.description,
      sheet: (target: string) =>
        defineMotion(systems[target as Name] as never, feature.spec as never),
      options: feature.scenario,
    },
  ]),
)

const here = fileURLToPath(import.meta.url)
const motionModule = fileURLToPath(
  new URL('../../motion/index.ts', import.meta.url),
)
const declaredModule = fileURLToPath(new URL('./declared.ts', import.meta.url))

export const runMotionSuite = () =>
  buildMatrix({
    features: matrixFeatures,
    targets,
    featuresModule: here,
    targetsModule: here,
    probeImports: () => ({
      [motionModule]: ['defineMotion'],
      [declaredModule]: ['systems'],
    }),
    probe: (feature, target) => {
      const at = `features[${JSON.stringify(feature)}]`
      return `targets[${JSON.stringify(target)}](defineMotion(systems[${JSON.stringify(target)}], ${at}.spec), ${at}.scenario)`
    },
  })
