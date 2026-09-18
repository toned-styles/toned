import assert from 'node:assert/strict'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const source = process.argv[2]!
const version = process.argv[3]!
const evidenceDirectory = process.argv[4]!
const rawStyle = process.argv.includes('--raw-style')
const moduleAt = (name: string) =>
  import(pathToFileURL(join(source, name)).href)
const hasModule = (name: string) => existsSync(join(source, name))
const core = await moduleAt('packages/toned-core/index.ts')
const { Base } = await moduleAt('packages/toned-core/stylesheet/StyleSheet.ts')
let resolves = 0
const system = core.defineSystem({
  offset: core.defineToken({
    values: Array.from({ length: 42 }, (_, day) => day),
    resolve: (value: number) => ({ marginLeft: value }),
  }),
  shade: core.defineToken({
    values: ['rest', 'selected', 'disabled'],
    resolve: (value: string) => {
      resolves++
      return {
        opacity: value === 'selected' ? 0.5 : value === 'disabled' ? 0.25 : 1,
      }
    },
  }),
})
const rules = {
  Root: { shade: 'rest' },
  '[selected=true]': { Root: { shade: 'selected' } },
  '[disabled=true]': { Root: { shade: 'disabled' } },
}
const config = {
  ...core.getConfig(),
  getTokens: () => ({}),
  platform: 'native',
  mediaMode: false,
  pseudoMode: 'runtime',
  useClassName: false,
}
const create = () => new Base({ ref: system, rules, config })
let sink: unknown
function measure(iterations: number, run: () => unknown) {
  for (let i = 0; i < 100; i++) sink = run()
  const samples = []
  for (let round = 0; round < 5; round++) {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) sink = run()
    samples.push(((performance.now() - start) * 1000) / iterations)
  }
  return Number(samples.sort((a, b) => a - b)[2]!.toFixed(3))
}
const construction_us = measure(1000, create)
// Fresh declaration and matcher identities on every call: includes authoring,
// normalization, variant expansion and first controller compilation. Reuses only
// the token system, just as separately declared sheets in one application do.
const cold_stylesheet_compile_us = measure(100, () => {
  const fresh = system
    .stylesheet({
      Root: { shade: 'rest', ':hover': { shade: 'selected' } },
      ...Object.fromEntries(
        Array.from({ length: 42 }, (_, day) => [
          `Day${day}`,
          {
            shade: 'rest',
            offset: day,
            ...(rawStyle
              ? {
                  style: {
                    paddingTop: day % 4,
                    opacity: 0.9,
                    width: 40,
                    height: 32,
                  },
                }
              : {}),
          },
        ]),
      ),
    })
    .variants(($: any) => ({
      [$.selected(true)]: { Root: { shade: 'selected' } },
      [$.disabled(true)]: { Root: { shade: 'disabled' } },
    }))
  const base = fresh[core.SYMBOL_INIT](config, {
    selected: false,
    disabled: false,
  })
  assert.equal(base.getCurrentStyle('Day41').style.marginLeft, 41)
  if (rawStyle) assert.equal(base.getCurrentStyle('Day41').style.width, 40)
  base.dispose?.()
  return base
})
const controllers = Array.from({ length: 42 }, create)
const shared_matchers = new Set(controllers.map((base) => base.matcher)).size
assert.ok(
  controllers.every((base) => base.matcher),
  'sharing must count real matcher objects',
)
let shared_portable_plans: number | undefined
if (hasModule('packages/toned-core/core/plan.ts')) {
  const { compileRules } = await moduleAt('packages/toned-core/core/plan.ts')
  shared_portable_plans = new Set(
    controllers.map((base) => compileRules(base.ref, base.rules, 'native')),
  ).size
  assert.equal(shared_portable_plans, 1)
}
let writes = 0
let unregister: (() => void)[] = []
const native = hasModule('packages/toned-core/stylesheet/native-host.ts')
  ? await moduleAt('packages/toned-core/stylesheet/native-host.ts')
  : undefined
const writer = native
  ? await moduleAt('packages/toned-core/stylesheet/applyStyles.ts')
  : undefined
const hosts = controllers.map((base) => {
  const host = {
    isConnected: true,
    setNativeProps: () => {
      writes++
    },
  }
  if (native)
    unregister.push(
      native.registerNativeHost(host, {
        id: 'benchmark/merge',
        renderer: 'custom',
        version: '1',
        accepts: () => true,
        patch: () => host.setNativeProps(),
        resetStyle: () => null,
        resetProp: () => null,
      }),
    )
  base.refs.Root = new Set([host])
  writer?.recordHostCommit(host, base.getCurrentStyle('Root'))
  return host
})
const beforeUpdateResolves = resolves
for (const base of controllers) base.applyState({ selected: true })
const first_transition_writes = writes
for (let i = 0; i < 100; i++)
  for (const base of controllers) base.applyState({ selected: true })
const repeated_state_writes = writes - first_transition_writes
for (const base of controllers) base.applyState({ selected: false })
const reset_transition_writes =
  writes - first_transition_writes - repeated_state_writes
const update_resolver_calls = resolves - beforeUpdateResolves
assert.equal(first_transition_writes, 42)
assert.equal(reset_transition_writes, 42)
assert.equal(repeated_state_writes, 0)
if (version === 'current') {
  assert.equal(shared_matchers, 1)
  assert.ok(
    update_resolver_calls <= 84,
    'resolved unchanged operations must stay cached across controller updates',
  )
}
for (const base of controllers) {
  base.refs = {}
  base.dispose?.()
}
for (const stop of unregister) stop()
unregister = []
void hosts

// Use one physical React installation for both source trees. This measures a
// synthetic component workload using each version's real useStyles binding.
const { Window } = await import(
  '../packages/toned-react/node_modules/happy-dom/lib/index.js'
)
const window = new Window()
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  MutationObserver: window.MutationObserver,
  IS_REACT_ACT_ENVIRONMENT: true,
})
const React = await import(
  '../packages/toned-react/node_modules/react/index.js'
)
const { createRoot } = await import(
  '../packages/toned-react/node_modules/react-dom/client.js'
)
const binding = await moduleAt('packages/toned-react/index.ts')
const { renderToString } = await import(
  '../packages/toned-react/node_modules/react-dom/server.js'
)
const web = (await moduleAt('packages/toned-react/react-web.ts')).default
core.setConfig({
  ...web,
  getTokens: () => ({}),
  mediaMode: false,
  pseudoMode: 'runtime',
  useClassName: false,
})
const sheet = system
  .stylesheet({ Root: { shade: 'rest', ':hover': { shade: 'selected' } } })
  .variants(($: any) => ({
    [$.selected(true)]: { Root: { shade: 'selected' } },
  }))
let renders = 0
function Cell({ selected }: { selected: boolean }) {
  renders++
  const style = binding.useStyles(sheet, { selected })
  return React.createElement('div', style.Root, 'day')
}
const calendar = (selected: number) =>
  React.createElement(
    'div',
    null,
    Array.from({ length: 42 }, (_, day) =>
      React.createElement(Cell, { key: day, selected: day === selected }),
    ),
  )
const mountSamples: number[] = []
let mount_renders = 0,
  update_renders = 0,
  interaction_renders = 0
for (let round = 0; round < 6; round++) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  renders = 0
  const mountStart = performance.now()
  await React.act(async () => {
    root.render(calendar(0))
  })
  if (round) mountSamples.push(performance.now() - mountStart)
  assert.equal(container.querySelectorAll('div > div').length, 43)
  mount_renders = renders
  const beforeInteraction = renders
  const target = container.firstElementChild!.children[3]!
  target.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }))
  assert.equal((target as HTMLElement).style.opacity, '0.5')
  target.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true }))
  assert.equal((target as HTMLElement).style.opacity, '1')
  interaction_renders = renders - beforeInteraction
  assert.equal(interaction_renders, 0)
  await React.act(async () => {
    root.render(calendar(1))
  })
  update_renders = renders - mount_renders
  await React.act(async () => {
    root.unmount()
  })
  container.remove()
}
const react_mount_ms = Number(mountSamples.sort((a, b) => a - b)[2]!.toFixed(3))
// This mirrors Calendar's dayButtonEntry -> StyleOverrides -> Button path.
// Each child has a distinct override value (offset plus selected/range/edge-like
// state); entries are rebuilt when that child's selected state changes. It is
// deliberately synthetic so both historical cores see identical declarations.
let overrideEntries = 0
let overrideFactoryCalls = 0
function OverrideCell({ day, selected }: { day: number; selected: boolean }) {
  const style = binding.useStyles(sheet, { selected })
  return React.createElement(
    'button',
    { ...style.Root, 'data-day': day },
    String(day + 1),
  )
}
function DayScope({ day, selected }: { day: number; selected: boolean }) {
  const value = React.useMemo(() => {
    overrideEntries++
    return [
      binding
        .overrideStyles(sheet, {
          Root: {
            offset: day,
            ...(rawStyle
              ? {
                  style: {
                    paddingTop: day % 4,
                    opacity: 0.9,
                    width: 40,
                    height: 32,
                  },
                }
              : {}),
            shade: selected ? 'selected' : day % 7 === 0 ? 'disabled' : 'rest',
            ':hover': { shade: selected ? 'selected' : 'rest' },
          },
        })
        .variants(($: any) => {
          overrideFactoryCalls++
          return { [$.selected(true)]: { Root: { shade: 'selected' } } }
        }),
    ]
  }, [day, selected])
  return React.createElement(
    binding.StyleOverrides,
    { value },
    React.createElement(OverrideCell, { day, selected }),
  )
}
const overrideCalendar = (selected: number) =>
  React.createElement(
    'div',
    null,
    Array.from({ length: 42 }, (_, day) =>
      React.createElement(DayScope, {
        key: day,
        day,
        selected: day === selected,
      }),
    ),
  )
const overrideMountSamples: number[] = []
const overrideUpdateSamples: number[] = []
let override_mount_entries = 0,
  override_update_entries = 0,
  override_mount_factory_calls = 0,
  override_update_factory_calls = 0
for (let round = 0; round < 6; round++) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  overrideEntries = 0
  overrideFactoryCalls = 0
  const start = performance.now()
  await React.act(async () => {
    root.render(overrideCalendar(0))
  })
  if (round) overrideMountSamples.push(performance.now() - start)
  override_mount_entries = overrideEntries
  override_mount_factory_calls = overrideFactoryCalls
  assert.equal(override_mount_entries, 42)
  for (let day = 0; day < 42; day++) {
    const button = container.querySelector(`[data-day="${day}"]`) as HTMLElement
    assert.equal(button.style.marginLeft, `${day}px`)
    if (rawStyle) assert.equal(button.style.width, '40px')
  }
  const updateStart = performance.now()
  await React.act(async () => {
    root.render(overrideCalendar(1))
  })
  if (round) overrideUpdateSamples.push(performance.now() - updateStart)
  override_update_entries = overrideEntries - override_mount_entries
  assert.equal(override_update_entries, 2)
  override_update_factory_calls =
    overrideFactoryCalls - override_mount_factory_calls
  if (version === 'current') {
    assert.equal(override_mount_factory_calls, 42)
    assert.equal(
      override_update_factory_calls,
      2,
      '42 sibling scopes must retain unchanged derived sheets; only two entries changed',
    )
  }
  assert.equal(
    (container.querySelector('[data-day="1"]') as HTMLElement).style.opacity,
    '0.5',
  )
  await React.act(async () => {
    root.unmount()
  })
  container.remove()
}
const override_mount_ms = Number(
  overrideMountSamples.sort((a, b) => a - b)[2]!.toFixed(3),
)
const override_update_ms = Number(
  overrideUpdateSamples.sort((a, b) => a - b)[2]!.toFixed(3),
)
const inlineMarkup = renderToString(overrideCalendar(0))
const ssr_inline_bytes = Buffer.byteLength(inlineMarkup)
core.setConfig({ ...core.getConfig(), useClassName: true, pseudoMode: 'css' })
const cssMarkup = renderToString(overrideCalendar(0))
const ssr_css_bytes = Buffer.byteLength(cssMarkup)
const generator = await moduleAt('packages/toned-core/dom/generate.ts')
const css = hasModule('packages/toned-core/build/index.ts')
  ? (await moduleAt('packages/toned-core/build/index.ts')).buildStyles(system, {
      sheets: [sheet],
    }).css
  : generator.generate(system.system)
const generated_css_bytes = Buffer.byteLength(css)
writeFileSync(join(evidenceDirectory, `${version}-inline.html`), inlineMarkup)
writeFileSync(join(evidenceDirectory, `${version}-css.html`), cssMarkup)
writeFileSync(join(evidenceDirectory, `${version}-generated.css`), css)
assert.ok(ssr_inline_bytes > 0 && ssr_css_bytes > 0 && generated_css_bytes > 0)
assert.equal(document.body.childElementCount, 0)
await window.happyDOM.close()
sink = undefined
// Weak references independently sample object retention. Advance to a new job
// before forcing GC: weak targets created in this job are kept alive by design.
const disposedSamples: WeakRef<object>[] = []
function sampleDisposal() {
  for (let index = 0; index < 5000; index++) {
    const base = create()
    disposedSamples.push(new WeakRef(base))
    base.dispose?.()
  }
}
sampleDisposal()
await new Promise((resolve) => setTimeout(resolve, 0))
Bun.gc(true)
const retained_disposed_controllers = disposedSamples.filter(
  (sample) => sample.deref() !== undefined,
).length

console.log(
  JSON.stringify({
    version,
    construction_us,
    cold_stylesheet_compile_us,
    shared_matchers,
    ...(shared_portable_plans === undefined ? {} : { shared_portable_plans }),
    first_transition_writes,
    repeated_state_writes,
    reset_transition_writes,
    update_resolver_calls,
    react_mount_ms,
    override_mount_ms,
    override_update_ms,
    override_mount_entries,
    override_update_entries,
    override_mount_factory_calls,
    override_update_factory_calls,
    ssr_inline_bytes,
    ssr_css_bytes,
    generated_css_bytes,
    mount_renders,
    update_renders,
    interaction_renders,
    disposed_controller_samples: disposedSamples.length,
    retained_disposed_controllers,
    note: 'WeakRef retention samples disposed controllers after a new job and forced GC; it does not prove application-wide leak freedom. Bun process.memoryUsage().heapUsed is not used.',
  }),
)
