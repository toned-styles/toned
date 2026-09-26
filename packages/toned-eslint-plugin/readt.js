import { createRules } from './rules.js'

/** `readt` is the intentionally chosen React-rule namespace. */
export function createReadtPlugin(options = {}) {
  const all = createRules(options)
  const plugin = {
    meta: { name: 'readt', version: '0.1.0' },
    rules: Object.fromEntries(
      ['no-create-elements-in-render', 'no-partial-host-bag'].map((name) => [
        name,
        all[name],
      ]),
    ),
    configs: {},
  }
  plugin.configs.recommended = {
    plugins: { readt: plugin },
    rules: {
      'readt/no-create-elements-in-render': 'error',
      'readt/no-partial-host-bag': 'error',
    },
  }
  return plugin
}
export default createReadtPlugin()
