import { Section, Text } from '@react-email/components'

import { Button } from './Button.tsx'
import { props } from './styles.ts'

export default function Card() {
  return (
    <Section {...props.Card}>
      <Text>Concrete styles, with no external stylesheet.</Text>
      <Button label="Open your account" />
    </Section>
  )
}
