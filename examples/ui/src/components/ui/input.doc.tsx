import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Input } from './input.tsx'

export default doc({
  description:
    'A single-line text field with focus, invalid and disabled states.',
  components: [
    c(
      { Input },
      { placeholder: 'Type something...', type: 'text', disabled: false },
    ),
  ],
  preview: (C) => (
    <div {...t({ width: '100%', maxWidth: '320px' })}>
      <C.Input aria-label="Example input" />
    </div>
  ),
})
