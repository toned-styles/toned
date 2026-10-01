import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog.tsx'
import { Input } from './input.tsx'
import { Label } from './label.tsx'

export default doc({
  description:
    'A modal window over the page. Focus stays inside it until it is closed with the close button, Escape or a click outside.',
  components: [
    c({ Dialog }, {}),
    c({ DialogTrigger }, { asChild: true }),
    c({ DialogContent }, { showCloseButton: true }),
    c({ DialogHeader }, {}),
    c({ DialogFooter }, {}),
    c({ DialogTitle }, { children: 'Rename project' }),
    c(
      { DialogDescription },
      { children: 'The name appears in the sidebar and in release notes.' },
    ),
  ],
  preview: (C) => (
    <C.Dialog>
      <C.DialogTrigger>
        <Button variant="outline">Rename project</Button>
      </C.DialogTrigger>
      <C.DialogContent>
        <C.DialogHeader>
          <C.DialogTitle />
          <C.DialogDescription />
        </C.DialogHeader>
        <div {...t({ flexLayout: 'column', gap: 2 })}>
          <Label htmlFor="dialog-name">Name</Label>
          <Input id="dialog-name" defaultValue="Orbit workspace" />
        </div>
        <C.DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save name</Button>
          </DialogClose>
        </C.DialogFooter>
      </C.DialogContent>
    </C.Dialog>
  ),
})
