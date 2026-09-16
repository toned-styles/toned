/** Owned, differential host patches. Host bindings record declarative baselines at commit. */
import { camelToKebab } from '../utils/css.ts'
import { unitlessNumbers } from './unitlessNumbers.ts'

type Host = any
type Style = Record<string, any>
type Ownership = {
  previous: Style
  desired: Style
  baseline: Style
  classes: Set<string>
  callerClasses: Set<string>
  caller: Style
  nativeProps: Style
  callerProps: Style
}
const DEFAULT_OWNER = {}
const ownership = new WeakMap<object, WeakMap<object, Ownership>>()
const stateFor = (host: object, owner: object): Ownership => {
  let owners = ownership.get(host)
  if (!owners) {
    owners = new WeakMap()
    ownership.set(host, owners)
  }
  let state = owners.get(owner)
  if (!state) {
    state = {
      previous: {},
      desired: {},
      baseline: {},
      classes: new Set(),
      callerClasses: new Set(),
      caller: {},
      nativeProps: {},
      callerProps: {},
    }
    owners.set(owner, state)
  }
  return state
}
const cssValue = (key: string, value: unknown) =>
  value == null
    ? ''
    : typeof value === 'number' && !unitlessNumbers.has(key) && !key.startsWith('--')
      ? `${value}px`
      : String(value)
const read = (host: Host, key: string) => host.style.getPropertyValue(camelToKebab(key))

/** Called by the ref after React's declarative writes, never during render. */
export function recordHostCommit(
  host: Host,
  toned: Style,
  caller: Style = {},
  owner: object = DEFAULT_OWNER,
) {
  if (!host) return
  const state = stateFor(host, owner)
  const nextCaller = { ...(caller['style'] ?? {}) }
  for (const key in state.caller) if (!(key in nextCaller)) delete state.baseline[key]
  state.caller = nextCaller
  state.baseline = { ...state.baseline, ...state.caller }
  // React may skip a declarative write whose prop has not changed even if an
  // event changed the live host. Keep those previous imperative keys until the
  // layout reconciliation explicitly removes them.
  for (const key in { ...toned['style'], ...caller['style'] }) {
    if (host.setNativeProps) {
      if (!(key in state.previous))
        state.previous[key] = caller['style']?.[key] ?? toned['style']?.[key]
    } else {
      const live = read(host, key)
      if (state.previous[key] !== live) delete state.desired[key]
      state.previous[key] = live
    }
  }
  state.callerProps = caller
  for (const [key, value] of Object.entries(toned)) {
    if (key === 'style' || key === 'className' || key === 'ref' || key.startsWith('on')) continue
    if (!(key in state.nativeProps)) state.nativeProps[key] = caller[key] ?? value
  }
  state.classes = new Set([
    ...state.classes,
    ...(toned['className'] ?? '').split(/\s+/).filter(Boolean),
  ])
  state.callerClasses = new Set((caller['className'] ?? '').split(/\s+/).filter(Boolean))
}

export const setStyles = (
  host: Host | undefined,
  output: Style = {},
  owner: object = DEFAULT_OWNER,
) => {
  if (!host || (!host.setNativeProps && !host.style)) return
  const state = stateFor(host, owner)
  const next = { ...output['style'], ...state.caller }
  const patch: Style = {}
  for (const key in state.previous) {
    if (key in next) continue
    if (host.setNativeProps) patch[key] = state.baseline[key] ?? null
    else if (read(host, key) === state.previous[key]) {
      const value = cssValue(key, state.baseline[key])
      if (read(host, key) !== value) patch[key] = value
    }
  }
  const previous: Style = {}
  const desired: Style = {}
  for (const key in next) {
    const value = host.setNativeProps ? next[key] : cssValue(key, next[key])
    if (host.setNativeProps) {
      if (!(key in state.previous) || !Object.is(state.previous[key], value)) patch[key] = value
    } else {
      const live = read(host, key)
      if (!(key in state.previous) || live !== state.previous[key]) state.baseline[key] = live
      if (live !== value && !(state.desired[key] === value && live === state.previous[key]))
        patch[key] = value
    }
    previous[key] = value
    desired[key] = value
  }
  const nativePatch: Style = {}
  if (host.setNativeProps) {
    const props = Object.fromEntries(
      Object.entries(output).filter(([key]) => key !== 'style' && key !== 'className'),
    )
    for (const key in state.nativeProps)
      if (!(key in props)) {
        const reset = state.callerProps[key] ?? null
        if (!Object.is(state.nativeProps[key], reset)) nativePatch[key] = reset
      }
    for (const key in props) {
      const value = state.callerProps[key] ?? props[key]
      if (!Object.is(state.nativeProps[key], value)) nativePatch[key] = value
      props[key] = value
    }
    state.nativeProps = props
    if (Object.keys(patch).length) nativePatch['style'] = patch
    if (Object.keys(nativePatch).length) host.setNativeProps(nativePatch)
  } else if (Object.keys(patch).length) {
    for (const key in patch) {
      if (key.startsWith('--')) host.style.setProperty(key, patch[key])
      else host.style[key] = patch[key]
    }
  }
  if (!host.setNativeProps) {
    for (const key in previous) previous[key] = read(host, key)
    const classes = new Set<string>((output['className'] ?? '').split(/\s+/).filter(Boolean))
    for (const cls of state.classes) {
      if (!classes.has(cls) && !state.callerClasses.has(cls)) host.classList.remove(cls)
    }
    for (const cls of classes) if (!host.classList.contains(cls)) host.classList.add(cls)
    state.classes = classes
  }
  state.previous = previous
  state.desired = desired
}
