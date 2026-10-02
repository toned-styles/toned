import { cardStyles } from '@examples/shared'
import { useStyles } from '@toned/react'
import { Text, View } from 'react-native'

import { Button } from './Button'

export default function Card() {
  const s = useStyles(cardStyles)

  return (
    <View {...s.Root}>
      <Button label="Press me" />

      <Text {...s.Hint}>
        Edit <Text {...s.Code}>App.tsx</Text> and save to reload
      </Text>
    </View>
  )
}
