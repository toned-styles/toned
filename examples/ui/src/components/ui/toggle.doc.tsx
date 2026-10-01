import { t } from '@toned/systems/base'
import { BoldIcon, ItalicIcon, UnderlineIcon } from 'lucide-react'
import { c, doc } from '@/lib/doc.tsx'
import { Toggle } from './toggle.tsx'

export default doc({
  description:
    'A button that stays pressed until it is pressed again. Two appearances and three sizes.',
  components: [
    c(
      { Toggle },
      {
        'aria-label': 'Bold',
        variant: 'outline',
        size: 'default',
        defaultPressed: true,
        disabled: false,
      },
    ),
  ],
  preview: (C) => (
    <div {...t({ flexLayout: 'row', alignItems: 'center', gap: 2 })}>
      <C.Toggle>
        <BoldIcon />
      </C.Toggle>
      <Toggle aria-label="Italic" variant="outline">
        <ItalicIcon />
      </Toggle>
      <Toggle aria-label="Underline" variant="outline">
        <UnderlineIcon />
        Underline
      </Toggle>
    </div>
  ),
})
