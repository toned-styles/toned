import { c, doc } from '@/lib/doc.tsx'
import { Alert, AlertDescription, AlertTitle } from './alert.tsx'

export default doc({
  components: [
    c({ Alert }, {}),
    c({ AlertTitle }, { children: 'Heads up!' }),
    c(
      { AlertDescription },
      { children: 'You can add components to your app using the CLI.' },
    ),
  ],
  preview: (C) => (
    <C.Alert>
      <C.AlertTitle />
      <C.AlertDescription />
    </C.Alert>
  ),
})
