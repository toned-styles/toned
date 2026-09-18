import { defineReactNativeHost } from '@toned/core/stylesheet'
import nativeConfig from '@toned/react/react-native'
import {
  Dimensions,
  I18nManager,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native'

/** Deliberately pinned integration. Passing this app certifies this renderer,
 * not every object exposing setNativeProps or every React Native version. */
export const nativeHost = Object.freeze({
  ...defineReactNativeHost({
    renderer: 'fabric',
    version: '0.86.0',
    isHost: (host) => {
      // RN 0.86 primitive refs expose public native Element nodes. A composite
      // merely forwarding measure/setNativeProps is not an accepted host.
      const node = host as {
        nodeType?: number
        nodeName?: string
        isConnected?: boolean
      }
      return (
        Boolean(
          (globalThis as { nativeFabricUIManager?: unknown })
            .nativeFabricUIManager,
        ) &&
        node.nodeType === 1 &&
        node.nodeName?.startsWith('RN:') === true &&
        node.isConnected === true
      )
    },
  }),
  getViewportWidth: () => Dimensions.get('window').width,
  subscribeViewport: (notify: () => void) => {
    const subscription = Dimensions.addEventListener('change', notify)
    return () => subscription.remove()
  },
})

export const config = Object.freeze({
  ...nativeConfig,
  nativeHost,
  getDirection: () => (I18nManager.isRTL ? ('rtl' as const) : ('ltr' as const)),
  resolveElement: (kind?: string) => {
    switch (kind) {
      case undefined:
      case 'view':
        return View
      case 'text':
        return Text
      case 'image':
        return Image
      case 'pressable':
        return Pressable
      default:
        throw new Error(`Unsupported acceptance primitive: ${kind}`)
    }
  },
})
