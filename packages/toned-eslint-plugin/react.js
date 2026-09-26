import { createRules } from './rules.js'

/** React-specific Toned rules. */
export function createReactPlugin(options = {}) {
  const all = createRules(options)
  const plugin = {
    meta: { name: 'react-toned', version: '0.1.0' },
    rules: Object.fromEntries(
      ['no-create-elements-in-render', 'no-partial-host-bag'].map((name) => [
        name,
        all[name],
      ]),
    ),
    configs: {},
  }
  plugin.configs.recommended = {
    plugins: { 'react-toned': plugin },
    rules: {
      'react-toned/no-create-elements-in-render': 'error',
      'react-toned/no-partial-host-bag': 'error',
    },
  }
  return plugin
}
export default createReactPlugin()
