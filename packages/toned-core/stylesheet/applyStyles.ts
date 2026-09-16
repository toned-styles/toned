/** Differential host patches with per-controller requests and committed declarations. */
import { camelToKebab } from '../utils/css.ts'
import { serializeCssValue } from '../utils/css-value.ts'
import { nativeHostAdapter } from './native-host.ts'

type Host = any
type Style = Record<string, any>
type Ownership = {
  previous: Style
  desired: Style
  baseline: Style
  classes: Set<string>
  nativeProps: Style
}
type OwnerRequest = {
  output: Style
  caller: Style
  declarative: Style
}
type HostOwnership = { state: Ownership; owners: Map<object, OwnerRequest> }
const DEFAULT_OWNER = {}
const ownership = new WeakMap<object, HostOwnership>()
const stateFor = (host: object): HostOwnership => {
  let entry = ownership.get(host)
  if (!entry) {
    entry = {
      state: {
        previous: {},
        desired: {},
        baseline: {},
        classes: new Set(),
        nativeProps: {},
      },
      owners: new Map(),
    }
    ownership.set(host, entry)
  }
  return entry
}
const requestFor = (entry: HostOwnership, owner: object): OwnerRequest => {
  let request = entry.owners.get(owner)
  if (!request) {
    request = { output: {}, caller: {}, declarative: {} }
    entry.owners.set(owner, request)
  }
  return request
}
const hostProps = (output: Style): Style =>
  Object.fromEntries(
    Object.entries(output).filter(
      ([key]) =>
        key !== 'style' &&
        key !== 'className' &&
        key !== 'ref' &&
        !key.startsWith('on'),
    ),
  )

// Attachment order defines precedence. An event does not promote its owner
// over another controller; removing a request reveals the surviving owner.
function aggregate(entry: HostOwnership, releasing?: object): Style {
  const style: Style = {}
  const props: Style = {}
  const classes = new Set<string>()
  for (const [owner, request] of entry.owners) {
    const output = owner === releasing ? request.declarative : request.output
    Object.assign(style, output['style'], request.caller['style'])
    Object.assign(props, hostProps(output), hostProps(request.caller))
    for (const source of [output, request.caller])
      for (const name of (source['className'] ?? '')
        .split(/\s+/)
        .filter(Boolean))
        classes.add(name)
  }
  return { ...props, style, className: [...classes].join(' ') }
}
const read = (host: Host, key: string) =>
  host.style.getPropertyValue(camelToKebab(key))

/** Called by the ref after React's declarative writes, never during render. */
export function recordHostCommit(
  host: Host,
  toned: Style,
  caller: Style = {},
  owner: object = DEFAULT_OWNER,
) {
  if (!host) return
  const native = nativeHostAdapter(host)
  if (!native && !host.style)
    throw new Error(
      '[toned/native] Register a declared native host adapter before committing styles',
    )
  const entry = stateFor(host)
  const state = entry.state
  const request = requestFor(entry, owner)
  const previousDeclaration = request.declarative
  request.caller = caller
  request.declarative = {
    ...hostProps(toned),
    ...hostProps(caller),
    style: { ...toned['style'], ...caller['style'] },
    className: [toned['className'], caller['className']]
      .filter(Boolean)
      .join(' '),
  }
  // A new owner starts with the declaration React just installed. Existing
  // imperative requests survive until its layout-phase reconciliation.
  if (!Object.keys(previousDeclaration).length) request.output = toned
  const nextDeclaration = request.declarative['style']
  for (const key in { ...previousDeclaration['style'], ...nextDeclaration }) {
    if (native) {
      // React skips unchanged props, but a changed resting value really did
      // replace the imperative value. Invalidate that comparison baseline.
      if (
        !(key in state.previous) ||
        !Object.is(previousDeclaration['style']?.[key], nextDeclaration[key])
      )
        state.previous[key] = nextDeclaration[key] ?? native.resetStyle(key)
    } else {
      const live = read(host, key)
      if (state.previous[key] !== live) delete state.desired[key]
      state.previous[key] = live
    }
  }
  for (const key in {
    ...hostProps(previousDeclaration),
    ...hostProps(request.declarative),
  }) {
    const value = request.declarative[key] ?? native?.resetProp(key) ?? null
    if (
      !(key in state.nativeProps) ||
      !Object.is(previousDeclaration[key], value)
    )
      state.nativeProps[key] = value
  }
  state.classes = new Set([
    ...state.classes,
    ...(toned['className'] ?? '').split(/\s+/).filter(Boolean),
  ])
}

/**
 * Callback-ref cleanup runs before React mutates host props. Restore this
 * controller's committed declaration now, so React's old-to-new prop diff can
 * remove imperative-only additions and preserve unchanged declarative values.
 * Other controllers keep their current requests until their own cleanup.
 */
export function prepareHostRelease(host: Host, owner: object): void {
  if (!host) return
  const entry = ownership.get(host)
  if (!entry?.owners.has(owner)) return
  writeStyles(host, aggregate(entry, owner), entry.state)
}

/** Called only for a completed ref detachment, never a render or ref handoff. */
export function releaseHost(host: Host, owner: object): void {
  const entry = ownership.get(host)
  if (!entry || !entry.owners.delete(owner)) return
  // React may have reused a still-connected host and already written its new
  // declaration. Even an identical value now belongs to that new caller. Final
  // detachment must therefore drop bookkeeping without another host mutation;
  // prepareHostRelease already removed imperative-only effects before takeover.
  // Native refs likewise provide no safe mounted-state inspection here.
  if (!entry.owners.size) {
    ownership.delete(host)
    return
  }
  writeStyles(host, aggregate(entry), entry.state)
}

export const setStyles = (
  host: Host | undefined,
  output: Style = {},
  owner: object = DEFAULT_OWNER,
) => {
  if (!host) return
  if (!nativeHostAdapter(host) && !host.style)
    throw new Error(
      '[toned/native] Register a declared native host adapter before writing styles',
    )
  const entry = stateFor(host)
  requestFor(entry, owner).output = output
  writeStyles(host, aggregate(entry), entry.state)
}

function writeStyles(host: Host, output: Style, state: Ownership): void {
  const native = nativeHostAdapter(host)
  const next = output['style'] ?? {}
  const patch: Style = {}
  for (const key in state.previous) {
    if (key in next) continue
    if (native) patch[key] = native.resetStyle(key)
    else if (read(host, key) === state.previous[key]) {
      const value = serializeCssValue(key, state.baseline[key])
      if (read(host, key) !== value) patch[key] = value
    }
  }
  const previous: Style = {}
  const desired: Style = {}
  for (const key in next) {
    const value = native ? next[key] : serializeCssValue(key, next[key])
    if (native) {
      if (!(key in state.previous) || !Object.is(state.previous[key], value))
        patch[key] = value
    } else {
      const live = read(host, key)
      if (!(key in state.previous) || live !== state.previous[key])
        state.baseline[key] = live
      if (
        live !== value &&
        !(state.desired[key] === value && live === state.previous[key])
      )
        patch[key] = value
    }
    previous[key] = value
    desired[key] = value
  }
  const nativePatch: Style = {}
  if (native) {
    const props = Object.fromEntries(
      Object.entries(output).filter(
        ([key]) => key !== 'style' && key !== 'className',
      ),
    )
    for (const key in state.nativeProps)
      if (!(key in props)) {
        const reset = native.resetProp(key)
        if (!Object.is(state.nativeProps[key], reset)) nativePatch[key] = reset
      }
    for (const key in props) {
      const value = props[key]
      if (!Object.is(state.nativeProps[key], value)) nativePatch[key] = value
      props[key] = value
    }
    state.nativeProps = props
    if (Object.keys(patch).length) nativePatch['style'] = patch
    if (Object.keys(nativePatch).length) native.patch(host, nativePatch)
  } else if (Object.keys(patch).length) {
    for (const key in patch) {
      if (key.startsWith('--')) host.style.setProperty(key, patch[key])
      else host.style[key] = patch[key]
    }
  }
  if (!native) {
    for (const key in previous) previous[key] = read(host, key)
    const classes = new Set<string>(
      (output['className'] ?? '').split(/\s+/).filter(Boolean),
    )
    for (const cls of state.classes) {
      if (!classes.has(cls)) host.classList.remove(cls)
    }
    for (const cls of classes)
      if (!host.classList.contains(cls)) host.classList.add(cls)
    state.classes = classes
  }
  state.previous = previous
  state.desired = desired
}
