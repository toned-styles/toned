import { Text, View } from '@react-pdf/renderer'

import { Button } from './Button.tsx'
import { props } from './styles.ts'

export default function Card() {
  return (
    <View {...props.Card}>
      <Button label="Report summary" />
      <Text>Explicit point-based styles, resolved without React context.</Text>
    </View>
  )
}
