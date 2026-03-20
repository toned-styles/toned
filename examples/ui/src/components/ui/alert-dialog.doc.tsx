import { doc, c } from '@/lib/doc'
import { Button } from './button'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './alert-dialog'

export default doc({
  components: [
    c({ AlertDialog }, {}),
    c({ AlertDialogTrigger }, { asChild: true }),
    c({ AlertDialogContent }, {}),
    c({ AlertDialogHeader }, {}),
    c({ AlertDialogFooter }, {}),
    c({ AlertDialogTitle }, { children: 'Are you sure?' }),
    c({ AlertDialogDescription }, { children: 'This action cannot be undone.' }),
    c({ AlertDialogAction }, { children: 'Continue' }),
    c({ AlertDialogCancel }, { children: 'Cancel' }),
  ],
  preview: (C) => (
    <C.AlertDialog>
      <C.AlertDialogTrigger>
        <Button variant="outline">Delete Account</Button>
      </C.AlertDialogTrigger>
      <C.AlertDialogContent>
        <C.AlertDialogHeader>
          <C.AlertDialogTitle />
          <C.AlertDialogDescription />
        </C.AlertDialogHeader>
        <C.AlertDialogFooter>
          <C.AlertDialogCancel />
          <C.AlertDialogAction />
        </C.AlertDialogFooter>
      </C.AlertDialogContent>
    </C.AlertDialog>
  ),
})
