import { doc, c } from '@/lib/doc'
import { Button } from './button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'

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
