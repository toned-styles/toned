import React from 'react'
import { AppRegistry, NativeModules, PixelRatio, Platform } from 'react-native'
import { Harness } from './src/Harness.tsx'
import { nativeHost } from './src/host.ts'

const reporter = NativeModules.TonedAcceptance
if (!reporter) throw new Error('Missing native acceptance reporter')
let nextRun = 0
function App() {
  const [runId] = React.useState(() => ++nextRun)
  const report = React.useCallback(
    (result) => reporter.report(JSON.stringify({ ...result, runId })),
    [runId],
  )
  React.useLayoutEffect(() => {
    report({
      kind: 'environment',
      react: React.version,
      reactNative: Platform.constants.reactNativeVersion,
      fabric: Boolean(globalThis.nativeFabricUIManager),
      hermes: Boolean(globalThis.HermesInternal),
      platform: Platform.OS,
      api: Platform.Version,
      density: PixelRatio.get(),
      compositeRejected: !nativeHost.accepts({
        measure() {},
        setNativeProps() {},
      }),
    })
  }, [report])
  return React.createElement(Harness, { report })
}
AppRegistry.registerComponent('TonedFabricAcceptance', () => App)
