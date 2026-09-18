import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog.tsx'

export default doc({
  components: [
    c({ Dialog }, {}),
    c({ DialogTrigger }, { asChild: true }),
    c({ DialogContent }, {}),
    c({ DialogHeader }, {}),
    c({ DialogFooter }, { showCloseButton: true }),
    c({ DialogTitle }, { children: 'Edit Profile' }),
    c(
      { DialogDescription },
      {
        children:
          "Make changes to your profile here. Click save when you're done.",
      },
    ),
  ],
  preview: (C) => (
    <C.Dialog>
      <C.DialogTrigger>
        <Button variant="outline">Open Dialog</Button>
      </C.DialogTrigger>
      <C.DialogContent>
        <C.DialogHeader>
          <C.DialogTitle />
          <C.DialogDescription />
        </C.DialogHeader>
        <C.DialogFooter />
      </C.DialogContent>
    </C.Dialog>
  ),
})
