import { createElements } from '@toned/react'
import { type CardVariants, cardStyles } from './styles.ts'

// One family for the whole card: variants go on `Card`, and every part
// inside reads them from it.
const Card = createElements(cardStyles)

export default function App(variants: Partial<CardVariants>) {
  return (
    <Card {...variants}>
      <Card.Root as="article">
        <Card.Header as="header">
          <Card.Title as="h3">Deploy preview</Card.Title>
          <Card.Status as="span">Ready</Card.Status>
        </Card.Header>
        <Card.Body as="p">
          Every part of this card comes from one stylesheet. Switch the density
          and the header, body and footer all adjust together.
        </Card.Body>
        <Card.Footer as="footer">
          <Card.Action as="button" type="button">
            Open preview
          </Card.Action>
        </Card.Footer>
      </Card.Root>
    </Card>
  )
}
