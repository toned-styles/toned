import { createRules } from './rules.js'

export function createTonedPlugin(options = {}) {
  const all = createRules(options)
  const plugin = {
    meta: { name: 'toned', version: '0.1.0' },
    rules: {
      ...Object.fromEntries(
        [
          'no-global-config',
          'prefer-canonical-declarations',
          'prefer-semantic-tokens',
        ].map((name) => [name, all[name]]),
      ),
      'react/no-create-elements-in-render': all['no-create-elements-in-render'],
      'react/no-partial-host-bag': all['no-partial-host-bag'],
    },
    configs: {},
  }
  // Global installation remains a compatibility API: only application policy enables its ban.
  plugin.configs.recommended = {
    plugins: { toned: plugin },
    rules: {
      'toned/prefer-canonical-declarations': 'warn',
      'toned/react/no-create-elements-in-render': 'error',
      'toned/react/no-partial-host-bag': 'error',
    },
  }
  return plugin
}
export default createTonedPlugin()
