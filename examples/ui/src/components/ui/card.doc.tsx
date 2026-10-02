import { t } from '@toned/systems/base'

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
    'A surface that groups related content. Density sets the spacing of every part at once; appearance changes the surface.',
  components: [
    c({ Card }, { density: 'comfortable', appearance: 'elevated' }),
    c({ CardHeader }, {}),
    c({ CardTitle }, { children: 'Release 2.4' }),
    c(
      { CardDescription },
      { children: 'Scheduled for Thursday. Two checks are still running.' },
    ),
    c(
      { CardContent },
      {
        children:
          'A card composes a header, content and a footer. Each part is a named rule in one stylesheet.',
      },
    ),
    c({ CardFooter }, {}),
  ],
  preview: (C) => (
    <C.Card {...t({ width: '100%', maxWidth: '400px' })}>
      <C.CardHeader>
        <C.CardTitle />
        <C.CardDescription />
      </C.CardHeader>
      <C.CardContent />
      <C.CardFooter>
        <Button>View release</Button>
        <Button variant="ghost">Dismiss</Button>
      </C.CardFooter>
    </C.Card>
  ),
})
