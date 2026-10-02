import { Text, View } from '@react-pdf/renderer'

import { props } from './styles.ts'

export function Button({ label }: { label: string }) {
  return (
    <View {...props.Action}>
      <Text {...props.ActionLabel}>{label}</Text>
    </View>
  )
}
