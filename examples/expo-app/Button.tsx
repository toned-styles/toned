import { buttonStyles } from '@examples/shared'
import { useStyles } from '@toned/react'
import { Pressable, Text } from 'react-native'

export function Button({ label }: { label: string }) {
  const s = useStyles(buttonStyles, { size: 'm', variant: 'accent' })

  return (
    <Pressable role="button" {...s.Root}>
      <Text {...s.Label}>{label}</Text>
    </Pressable>
  )
}
