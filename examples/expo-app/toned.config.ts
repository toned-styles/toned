import { defineConfig, setConfig } from '@toned/core'

import reactConfig from '@toned/react/react-native'

// should be preset for the framework?
// also add options to process css-variables/native/tailwind etc

export default setConfig(defineConfig(reactConfig))
