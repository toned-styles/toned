/** Actual explicit-provider/component-family workload; no global setConfig. */
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const source = process.argv[2]!,
  version = process.argv[3]!
const moduleAt = (name: string) =>
  import(pathToFileURL(join(source, name)).href)
const core = await moduleAt('packages/toned-core/index.ts')
const { createRenderer } = await moduleAt('packages/toned-core/server/index.ts')
const { Base } = await moduleAt('packages/toned-core/stylesheet/StyleSheet.ts')
const { registerNativeHost } = await moduleAt(
  'packages/toned-core/stylesheet/native-host.ts',
)
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
const { renderToString } = await import(
  '../packages/toned-react/node_modules/react-dom/server.js'
)
const { TonedProvider, createElements } = await moduleAt(
  'packages/toned-react/index.ts',
)
const web = (await moduleAt('packages/toned-react/react-web.ts')).default
let resolves = 0,
  hostProps = 0
const system = core.defineSystem({
  shade: core.defineToken({
    values: ['rest', 'selected'],
    resolve: (value: string, tokens: Record<string, unknown>) => {
      resolves++
      return { opacity: value === 'selected' ? 0.5 : 1, color: tokens['ink'] }
    },
  }),
})
const sheet = system
  .stylesheet({ Root: { shade: 'rest', ':hover': { shade: 'selected' } } })
  .variants(($: any) => ({
    [$.selected(true)]: { Root: { shade: 'selected' } },
  }))
const Family = createElements(sheet)
const backend = {
  id: 'literal-web',
  platform: 'web',
  browserConditions: false,
  resolve: (value: unknown) => value,
}
const renderer = createRenderer(system, { tokens: { ink: 'red' }, backend })
const host = {
  ...web,
  getProps(this: unknown, ...args: unknown[]) {
    hostProps++
    return web.getProps.apply(this, args)
  },
}
const median = (values: number[]) =>
  Number(
    [...values]
      .sort((a, b) => a - b)
      [Math.floor(values.length / 2)]!.toFixed(3),
  )
const output: Record<string, unknown> = { version }
const cells = (count: number, selected: number) =>
  React.createElement(
    'main',
    null,
    ...Array.from({ length: count }, (_, index) =>
      React.createElement(
        Family,
        { key: index, selected: index === selected },
        React.createElement(Family.Root, { 'data-cell': index }, String(index)),
      ),
    ),
  )
const tree = (children: any, theme?: object) =>
  React.createElement(
    TonedProvider,
    { renderer: [renderer], host },
    React.createElement(TonedProvider, { renderer, host, theme }, children),
  )

for (const count of [42, 250]) {
  const samples: Record<string, number[]> = {
    mount: [],
    stable: [],
    rerender: [],
    variant: [],
    theme: [],
    ssr: [],
  }
  const facts: Record<string, number> = {}
  for (let round = 0; round < 4; round++) {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const stable = cells(count, 0)
    const render = async (key: string, children: any, theme?: object) => {
      const before = resolves,
        prior = hostProps,
        started = performance.now()
      await React.act(async () => root.render(tree(children, theme)))
      if (round) samples[key]!.push(performance.now() - started)
      facts[`${key}_resolvers`] = resolves - before
      facts[`${key}_host_props`] = hostProps - prior
    }
    await render('mount', stable)
    const original = [...container.querySelectorAll('[data-cell]')]
    assert.equal(original.length, count)
    await render('stable', stable)
    if (version === 'current') {
      assert.equal(
        facts['stable_host_props'],
        0,
        'equivalent provider maps must not broadcast',
      )
      assert.equal(facts['stable_resolvers'], 0)
    }
    await render('rerender', cells(count, 0))
    if (version === 'current')
      assert.equal(
        facts['rerender_resolvers'],
        0,
        'private candidates reuse immutable outputs',
      )
    await render('variant', cells(count, 1))
    assert.equal(
      (container.querySelector('[data-cell="1"]') as HTMLElement).style.opacity,
      '0.5',
    )
    assert.equal(
      (container.querySelector('[data-cell="0"]') as HTMLElement).style.opacity,
      '1',
    )
    await render('theme', cells(count, 1), { ink: 'blue' })
    assert.equal(
      (container.querySelector('[data-cell="0"]') as HTMLElement).style.color,
      'blue',
    )
    assert.deepEqual(
      [...container.querySelectorAll('[data-cell]')],
      original,
      'updates preserve host identity',
    )
    const before = hostProps
    original[3]!.dispatchEvent(
      new window.MouseEvent('mouseover', { bubbles: true }),
    )
    assert.equal((original[3] as HTMLElement).style.opacity, '0.5')
    original[3]!.dispatchEvent(
      new window.MouseEvent('mouseout', { bubbles: true }),
    )
    assert.equal((original[3] as HTMLElement).style.opacity, '1')
    assert.equal(hostProps, before, 'interaction updates stay outside React')
    const started = performance.now()
    const markup = renderToString(tree(cells(count, 1)))
    if (round) samples['ssr']!.push(performance.now() - started)
    assert.ok(markup.includes('color:red'))
    await React.act(async () => root.unmount())
    container.remove()
  }
  output[`list_${count}`] = {
    ...Object.fromEntries(
      Object.entries(samples).map(([key, values]) => [
        `${key}_ms`,
        median(values),
      ]),
    ),
    ...facts,
  }
}

// Explicit t: spreading both public getters must resolve once, without changing
// legacy live-context semantics (covered by the separate regression suite).
const compose = []
let compositionCalls = 0
for (let round = 0; round < 5; round++) {
  const prior = resolves,
    start = performance.now()
  for (let index = 0; index < 2000; index++) {
    const value = { ...renderer.t({ shade: 'rest' }) }
    assert.equal(value.style.color, 'red')
  }
  compose.push(((performance.now() - start) * 1000) / 2000)
  compositionCalls = resolves - prior
}
if (version === 'current') assert.equal(compositionCalls, 2000)
output['token_spread'] = {
  us: median(compose),
  resolver_calls_per_2000: compositionCalls,
}

// Native is a declared JS host adapter, not a device/Fabric performance claim.
let patches = 0
const adapter = {
  id: 'provider-benchmark',
  renderer: 'custom',
  version: '1',
  accepts: () => true,
  patch: () => patches++,
  resetStyle: () => null,
  resetProp: () => null,
}
const nativeConfig = {
  platform: 'native',
  nativeHost: adapter,
  getTokens: () => renderer.tokens,
  useClassName: false,
  mediaMode: false,
  pseudoMode: 'runtime',
}
const rules = {
  Root: { shade: 'rest' },
  '[selected=true]': { Root: { shade: 'selected' } },
}
const timings = []
for (let round = 0; round < 5; round++) {
  const start = performance.now()
  for (let index = 0; index < 200; index++) {
    const target = {},
      unregister = registerNativeHost(target, adapter)
    const base = new Base({ ref: system, rules, config: nativeConfig })
    const detach = base.attach('Root', target, base.getRestingStyle('Root'))
    const stop = base.mount()
    const before = patches
    base.applyState({ selected: true })
    assert.equal(patches, before + 1)
    base.applyState({ selected: true })
    assert.equal(patches, before + 1)
    base.applyState({ selected: false })
    assert.equal(patches, before + 2)
    detach()
    stop()
    // Ref cleanup is generation-checked in a microtask; unregister afterwards.
    await Promise.resolve()
    unregister()
  }
  timings.push(((performance.now() - start) * 1000) / 200)
}
output['native_js_host_cycle_us'] = median(timings)
const weak: WeakRef<object>[] = []
function disposed() {
  for (let index = 0; index < 2000; index++) {
    const base = new Base({ ref: system, rules, config: nativeConfig })
    base.getCurrentStyle('Root')
    weak.push(new WeakRef(base))
    base.dispose()
  }
}
disposed()
assert.equal(document.body.childElementCount, 0)
await window.happyDOM.close()
await new Promise((resolve) => setTimeout(resolve, 0))
Bun.gc(true)
output['disposed_controllers'] = {
  samples: weak.length,
  retained: weak.filter((value) => value.deref()).length,
}
console.log(JSON.stringify(output))
