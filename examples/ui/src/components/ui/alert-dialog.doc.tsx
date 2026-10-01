import { c, doc } from '@/lib/doc.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog.tsx'
import { Button } from './button.tsx'

export default doc({
  description:
    'A modal that asks for confirmation before a consequential action. It can only be closed by choosing one of its buttons or pressing Escape.',
  components: [
    c({ AlertDialog }, {}),
    c({ AlertDialogTrigger }, { asChild: true }),
    c({ AlertDialogContent }, { size: 'default' }),
    c({ AlertDialogHeader }, {}),
    c({ AlertDialogFooter }, {}),
    c({ AlertDialogTitle }, { children: 'Delete this project?' }),
    c(
      { AlertDialogDescription },
      {
        children:
          'The project and its deployments are removed. This cannot be undone.',
      },
    ),
    c(
      { AlertDialogAction },
      { children: 'Delete project', variant: 'destructive' },
    ),
    c({ AlertDialogCancel }, { children: 'Cancel' }),
  ],
  preview: (C) => (
    <C.AlertDialog>
      <C.AlertDialogTrigger>
        <Button variant="outline">Delete project</Button>
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
