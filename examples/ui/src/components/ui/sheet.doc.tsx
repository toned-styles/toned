import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import { Input } from './input.tsx'
import { Label } from './label.tsx'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet.tsx'

export default doc({
  description:
    'A panel that slides in from an edge of the screen, for a task that keeps the page behind it in view.',
  components: [
    c({ Sheet }, {}),
    c({ SheetTrigger }, { asChild: true }),
    c({ SheetContent }, { side: 'right' }),
    c({ SheetHeader }, {}),
    c({ SheetTitle }, { children: 'Notification settings' }),
    c(
      { SheetDescription },
      { children: 'Choose where release updates are sent.' },
    ),
    c({ SheetFooter }, {}),
  ],
  preview: (C) => (
    <C.Sheet>
      <C.SheetTrigger>
        <Button variant="outline">Open settings</Button>
      </C.SheetTrigger>
      <C.SheetContent>
        <C.SheetHeader>
          <C.SheetTitle />
          <C.SheetDescription />
        </C.SheetHeader>
        <div {...t({ flexLayout: 'column', gap: 2, paddingX: 5 })}>
          <Label htmlFor="sheet-email">Email</Label>
          <Input
            id="sheet-email"
            type="email"
            defaultValue="alex@example.com"
          />
        </div>
        <C.SheetFooter>
          <SheetClose asChild>
            <Button>Save settings</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
        </C.SheetFooter>
      </C.SheetContent>
    </C.Sheet>
  ),
})
