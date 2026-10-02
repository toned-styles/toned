import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Button } from './button.tsx'
import { Spinner } from './spinner.tsx'

export default doc({
  description:
    'A rotating indicator for work with no measurable progress. It takes the colour and position of the text around it.',
  components: [c({ Spinner }, {})],
  preview: (C) => (
    <div {...t({ flexLayout: 'row', alignItems: 'center', gap: 6 })}>
      <div
        {...t({
          flexLayout: 'row',
          alignItems: 'center',
          gap: 2,
          typo: 'body_small',
          textColor: 'muted',
        })}
      >
        <C.Spinner />
        Loading results
      </div>
      <Button disabled>
        <Spinner />
        Saving
      </Button>
    </div>
  ),
})
