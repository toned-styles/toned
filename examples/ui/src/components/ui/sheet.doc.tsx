import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet.tsx'

export default doc({
  components: [
    c({ Sheet }, {}),
    c({ SheetTrigger }, { asChild: true }),
    c({ SheetContent }, {}),
    c({ SheetHeader }, {}),
    c({ SheetTitle }, { children: 'Sheet Title' }),
    c(
      { SheetDescription },
      { children: 'Make changes to your settings here.' },
    ),
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
