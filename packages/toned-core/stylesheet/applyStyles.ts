/** Differential host patches with per-controller requests and committed declarations. */
import { camelToKebab } from '../utils/css.ts'
import { serializeCssValue } from '../utils/css-value.ts'
import { immutableSnapshot, isImmutableSnapshot } from '../utils/immutable.ts'
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
  aggregate?: { output: Style; caller: Style; value: Style }
}
export type HostOutput = Record<string, any>
export type HostOutputDriver = {
  update(output: HostOutput): void
  cancel(): void
  dispose(): void
}
type HostOwnership = {
  state: Ownership
  owners: Map<object, OwnerRequest>
  driver?: HostOutputDriver
}

/** Install only after host attachment. Frames use the same differential writer. */
export function interceptHostOutput(
  host: object,
  create: (
    initial: HostOutput,
    write: (output: HostOutput) => void,
  ) => HostOutputDriver,
): () => void {
  const entry = ownership.get(host)
  if (!entry?.owners.size)
    throw new Error('[toned/motion] Attach the Toned host before motion')
  if (entry.driver)
    throw new Error('[toned/motion] A host supports one motion controller')
  let active = true
  const initial = aggregate(entry)
  let driver: HostOutputDriver
  try {
    driver = create(initial, (output) => {
      if (active && ownership.get(host) === entry)
        writeStyles(host, output, entry.state)
    })
  } catch (cause) {
    active = false
    writeStyles(host, initial, entry.state)
    throw cause
  }
  entry.driver = driver
  return () => {
    if (!active) return
    active = false
    driver.dispose()
    if (entry.driver === driver) delete entry.driver
  }
}
function writeAggregate(host: Host, entry: HostOwnership): void {
  const output = aggregate(entry)
  if (entry.driver) entry.driver.update(output)
  else writeStyles(host, output, entry.state)
}
const EMPTY_OUTPUT: Style = immutableSnapshot({})
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
    request = {
      output: EMPTY_OUTPUT,
      caller: EMPTY_OUTPUT,
      declarative: EMPTY_OUTPUT,
    }
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

// Identity caches hold only certified immutable outputs. Caller-owned mutable
// objects are re-read on every request; class vocabulary is bounded independently.
const contributions = new WeakMap<
  object,
  { props: Style; classes: readonly string[]; value: Style }
>()
const classCache = new Map<string, readonly string[]>()
function classNames(source?: string | null): readonly string[] {
  const value = source ?? ''
  // Public className strings need a byte/character bound as well as an entry cap.
  if (value.length > 4096) return value.split(/\s+/).filter(Boolean)
  let names = classCache.get(value)
  if (!names) {
    names = Object.freeze([...new Set(value.split(/\s+/).filter(Boolean))])
    if (classCache.size === 64)
      classCache.delete(classCache.keys().next().value!)
    classCache.set(value, names)
  }
  return names
}
function contribution(output: Style) {
  const cached = contributions.get(output)
  if (cached) return cached
  const props = hostProps(output),
    classes = classNames(output['className'])
  const result = {
    props,
    classes,
    value: {
      ...props,
      style: output['style'] ?? EMPTY_OUTPUT,
      className: classes.join(' '),
    },
  }
  if (isImmutableSnapshot(output)) {
    result.value = immutableSnapshot(result.value)
    contributions.set(output, result)
  }
  return result
}
function ownerOutput(request: OwnerRequest, output: Style): Style {
  const caller = request.caller
  if (
    request.aggregate?.output === output &&
    request.aggregate.caller === caller
  )
    return request.aggregate.value
  const toned = contribution(output)
  if (caller === EMPTY_OUTPUT) return toned.value
  const authored = contribution(caller)
  if (
    !Object.keys(authored.props).length &&
    !authored.classes.length &&
    !Object.keys(caller['style'] ?? EMPTY_OUTPUT).length
  )
    return toned.value
  const classes = new Set([...toned.classes, ...authored.classes])
  const value = {
    ...toned.props,
    ...authored.props,
    style: { ...output['style'], ...caller['style'] },
    className: [...classes].join(' '),
  }
  // A single retained slot per mounted owner, never an unbounded history.
  if (isImmutableSnapshot(output) && isImmutableSnapshot(caller))
    request.aggregate = { output, caller, value: immutableSnapshot(value) }
  else delete request.aggregate
  return request.aggregate?.value ?? value
}

// Attachment order defines precedence. An event does not promote its owner
// over another controller; removing a request reveals the surviving owner.
function aggregate(entry: HostOwnership, releasing?: object): Style {
  if (entry.owners.size === 1) {
    const [owner, request] = entry.owners.entries().next().value!
    return ownerOutput(
      request,
      owner === releasing ? request.declarative : request.output,
    )
  }
  const style: Style = {},
    props: Style = {}
  const classes = new Set<string>()
  for (const [owner, request] of entry.owners) {
    const output = ownerOutput(
      request,
      owner === releasing ? request.declarative : request.output,
    )
    Object.assign(style, output['style'])
    Object.assign(props, output)
    for (const name of classNames(output['className'])) classes.add(name)
  }
  return { ...props, style, className: [...classes].join(' ') }
}
const read = (host: Host, key: string) =>
  host.style.getPropertyValue(camelToKebab(key))

/** Called by the ref after React's declarative writes, never during render. */
export function recordHostCommit(
  host: Host,
  toned: Style,
  caller: Style = EMPTY_OUTPUT,
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
  state.classes = new Set([...state.classes, ...classNames(toned['className'])])
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
  // A ref handoff may reattach this host in the same commit. Keep motion progress
  // and pending exits alive; final releaseHost disposes the driver.
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
    entry.driver?.dispose()
    ownership.delete(host)
    return
  }
  writeAggregate(host, entry)
}

export const setStyles = (
  host: Host | undefined,
  output: Style = EMPTY_OUTPUT,
  owner: object = DEFAULT_OWNER,
) => {
  if (!host) return
  if (!nativeHostAdapter(host) && !host.style)
    throw new Error(
      '[toned/native] Register a declared native host adapter before writing styles',
    )
  const entry = stateFor(host)
  requestFor(entry, owner).output = output
  writeAggregate(host, entry)
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
    const classes = new Set<string>(classNames(output['className']))
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
