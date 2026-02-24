import { doc, c } from '@/lib/doc'
import { Button } from './button'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'

export default doc({
  components: [
    c({ Sheet }, {}),
    c({ SheetTrigger }, { asChild: true }),
    c({ SheetContent }, {}),
    c({ SheetHeader }, {}),
    c({ SheetTitle }, { children: 'Sheet Title' }),
    c({ SheetDescription }, { children: 'Make changes to your settings here.' }),
  ],
  preview: (C) => (
    <C.Sheet>
      <C.SheetTrigger>
        <Button variant="outline">Open Sheet</Button>
      </C.SheetTrigger>
      <C.SheetContent>
        <C.SheetHeader>
          <C.SheetTitle />
          <C.SheetDescription />
        </C.SheetHeader>
      </C.SheetContent>
    </C.Sheet>
  ),
})
