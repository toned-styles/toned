import { doc, c } from '@/lib/doc'
import { Button } from './button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'

export default doc({
  components: [
    c({ Dialog }, {}),
    c({ DialogTrigger }, { asChild: true }),
    c({ DialogContent }, {}),
    c({ DialogHeader }, {}),
    c({ DialogFooter }, { showCloseButton: true }),
    c({ DialogTitle }, { children: 'Edit Profile' }),
    c({ DialogDescription }, {
      children: 'Make changes to your profile here. Click save when you\'re done.',
    }),
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
