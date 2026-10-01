import { styles } from '@examples/shared/button'
import { useStyles } from '@toned/react'
import { Pressable, Text } from 'react-native'

export function Button({ label }: { label: string }) {
  const s = useStyles(styles, {
    size: 'm',
    variant: 'accent',
  })

  return (
    <Pressable role="button" {...s.container}>
      <Text {...s.label}>{label}</Text>
    </Pressable>
  )
}
