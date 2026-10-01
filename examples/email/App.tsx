import { Body, Html } from 'react-email'

import Card from './Card.tsx'
import { props } from './styles.ts'

export default function App() {
  return (
    <Html>
      <Body {...props.Body}>
        <Card />
      </Body>
    </Html>
  )
}
