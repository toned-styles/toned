import { doc, c } from '@/lib/doc'
import { Alert, AlertTitle, AlertDescription } from './alert'

export default doc({
  components: [
    c({ Alert }, {}),
    c({ AlertTitle }, { children: 'Heads up!' }),
    c({ AlertDescription }, { children: 'You can add components to your app using the CLI.' }),
  ],
  preview: (C) => (
    <C.Alert>
      <C.AlertTitle />
      <C.AlertDescription />
    </C.Alert>
  ),
})
