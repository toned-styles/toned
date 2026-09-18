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
  components: [
    c({ Card }, {}),
    c({ CardHeader }, {}),
    c({ CardTitle }, { children: 'Card Title' }),
    c({ CardDescription }, { children: 'Card description goes here.' }),
    c({ CardContent }, { children: 'Card content' }),
    c({ CardFooter }, {}),
  ],
  preview: (C) => (
    <C.Card style={{ width: '350px' }}>
      <C.CardHeader>
        <C.CardTitle />
        <C.CardDescription />
      </C.CardHeader>
      <C.CardContent />
      <C.CardFooter>
        <Button>Save</Button>
      </C.CardFooter>
    </C.Card>
  ),
})
