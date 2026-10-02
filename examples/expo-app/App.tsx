import { ui } from '@examples/shared'
import { createNativeRenderer } from '@toned/core/server'
import { TonedProvider } from '@toned/react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'

import Card from './Card'
import { host } from './host'
import { tokens } from './tokens'

const renderer = createNativeRenderer(ui, { tokens })

export default function App() {
  return (
    <TonedProvider renderer={renderer} host={host}>
      <View style={styles.container}>
        <Card />
        <StatusBar style="auto" />
      </View>
    </TonedProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
