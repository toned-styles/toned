import { styles } from '@examples/shared/button'
import { Text, View } from '@react-pdf/renderer'
import { useStyles } from '@toned/react'

export function Button({ label }: { label: string }) {
  const s = useStyles(styles, {
    size: 'm',
    variant: 'accent',
  })

  return (
    <View
      {...s.container}
      style={{ ...s.container.style, borderWidth: 0.00005 }}
    >
      <Text {...s.label}>{label}</Text>
    </View>
  )
}
