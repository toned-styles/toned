import { defineReactNativeHost } from '@toned/core/stylesheet'
import type { ReactHost } from '@toned/react'
import { nativeHost } from '@toned/react/hosts/native'
import { Pressable, Text, View } from 'react-native'

/**
 * The native host for this app: React Native's Fabric renderer and its
 * primitives. Toned writes interaction styles directly to accepted host
 * instances, so the adapter checks that a ref is a connected Fabric element
 * rather than any object with `setNativeProps`.
 */
const adapter = defineReactNativeHost({
  renderer: 'fabric',
  version: '0.86.3',
  isHost: (host) => {
    const node = host as {
      nodeType?: number
      nodeName?: string
      isConnected?: boolean
    }
    return (
      'nativeFabricUIManager' in globalThis &&
      node.nodeType === 1 &&
      node.nodeName?.startsWith('RN:') === true &&
      node.isConnected === true
    )
  },
})

const elements = { view: View, text: Text, pressable: Pressable } as const

export const host: ReactHost = Object.freeze({
  ...nativeHost,
  nativeHost: adapter,
  resolveElement: (kind?: string) => {
    const element = elements[(kind ?? 'view') as keyof typeof elements]
    if (!element) throw new Error(`No native primitive for $kind ${kind}`)
    return element
  },
})
