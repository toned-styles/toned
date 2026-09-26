import { createRules } from './rules.js'

export function createTonedPlugin(options = {}) {
  const all = createRules(options)
  const plugin = {
    meta: { name: 'toned', version: '0.1.0' },
    rules: Object.fromEntries(
      [
        'no-global-config',
        'prefer-canonical-declarations',
        'prefer-semantic-tokens',
      ].map((name) => [name, all[name]]),
    ),
    configs: {},
  }
  // Global installation remains a compatibility API: only application policy enables its ban.
  plugin.configs.recommended = {
    plugins: { toned: plugin },
    rules: { 'toned/prefer-canonical-declarations': 'warn' },
  }
  return plugin
}
export default createTonedPlugin()
