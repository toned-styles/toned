import { defineConfig, setConfig } from '@toned/core'
import reactConfig from '@toned/react/react-web'

// The consuming application imports generated CSS (the docs app uses Vite's
// virtual:toned.css). This shared component package never injects CSS at runtime.

export default setConfig(
  defineConfig({
    ...reactConfig,
    useClassName: true,
    useMedia: true,
    mediaMode: 'css',
    pseudoMode: 'css',
  }),
)
