import {styles} from '@examples/shared/card'
import {useStyles} from '@toned/react/index'
import {t} from '@toned/systems/base'
import {Text, View} from 'react-native'

import {Button} from './Button'

function Card() {
  const s = useStyles(styles)

  return (
    <View {...s.container}>
      <Button label={String(Math.random())} />

      <Text {...t({textColor: 'status_info'})}>
        Edit <Text {...s.code}>src/App.tsx</Text> and save to test HMR
      </Text>
    </View>
  )
}

export default Card
