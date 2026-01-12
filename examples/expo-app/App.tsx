import '@expo/match-media'

import '@toned/themes/shadcn/config.css'
import './toned.config.ts'

import {defineContext, TokensContext} from '@toned/react/ctx'
import shadcn from '@toned/themes/shadcn/config'
import * as ScreenOrientation from 'expo-screen-orientation'
import {StatusBar} from 'expo-status-bar'
import {useEffect} from 'react'
import {StyleSheet, View} from 'react-native'
import Card from './Card'

const ctx = defineContext(shadcn)

const Main = () => {
  useEffect(() => {
    const unlockScreenOerientation = async () => {
      await ScreenOrientation.unlockAsync()
    }
    unlockScreenOerientation()
  }, [])

  return (
    <View style={styles.container}>
      <TokensContext.Provider value={ctx}>
        <Card />
      </TokensContext.Provider>
      <StatusBar style="auto" />
    </View>
  )
}

export default function App() {
  return <Main />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
