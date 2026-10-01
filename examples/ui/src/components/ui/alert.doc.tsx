import { t } from '@toned/systems/base'
import { CircleAlertIcon, InfoIcon } from 'lucide-react'
import { c, doc } from '@/lib/doc.tsx'
import { Alert, AlertDescription, AlertTitle } from './alert.tsx'

export default doc({
  description:
    'A message that needs attention without interrupting the task. An icon placed first becomes a leading column.',
  components: [
    c({ Alert }, { variant: 'default' }),
    c({ AlertTitle }, { children: 'A new version is available' }),
    c(
      { AlertDescription },
      { children: 'Version 2.4 adds container queries. Update when ready.' },
    ),
  ],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 3, width: '420px', maxWidth: '100%' })}
    >
      <C.Alert>
        <InfoIcon />
        <C.AlertTitle />
        <C.AlertDescription />
      </C.Alert>
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>The build failed</AlertTitle>
        <AlertDescription>
          Two type errors were found. Fix them and run the build again.
        </AlertDescription>
      </Alert>
    </div>
  ),
})
