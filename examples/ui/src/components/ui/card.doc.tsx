import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card.tsx'

export default doc({
  description:
    'One family, seven parts. Density flows through the whole card; appearance changes the surface without changing its contents.',
  components: [
    c({ Card }, { density: 'comfortable', appearance: 'elevated' }),
    c({ CardHeader }, {}),
    c({ CardTitle }, { children: 'Ship something beautiful' }),
    c(
      { CardDescription },
      { children: 'Your next release deserves a thoughtful interface.' },
    ),
    c(
      { CardContent },
      {
        children:
          'Compose headers, actions and footers. Every part has a named, editable stylesheet rule.',
      },
    ),
    c({ CardFooter }, {}),
  ],
  preview: (C) => (
    <C.Card style={{ width: '100%', maxWidth: '420px' }}>
      <C.CardHeader>
        <C.CardTitle />
        <C.CardDescription />
      </C.CardHeader>
      <C.CardContent />
      <C.CardFooter>
        <Button>View release</Button>
      </C.CardFooter>
    </C.Card>
  ),
})
