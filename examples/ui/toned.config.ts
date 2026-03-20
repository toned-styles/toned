import { system } from '@toned/systems/base'
import { inject } from '@toned/core/dom'
import { defineConfig, setConfig } from '@toned/core'
import reactConfig from '@toned/react/react-web'

inject(system)

export default setConfig(
  defineConfig({
    ...reactConfig,
    useClassName: true,
    useMedia: true,
    mediaMode: 'css',
    pseudoMode: 'css',
  }),
)
