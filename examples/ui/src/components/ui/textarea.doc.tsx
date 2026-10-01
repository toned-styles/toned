import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Label } from './label.tsx'
import { Textarea } from './textarea.tsx'

export default doc({
  description:
    'A multi-line text field. It grows with its content and can be resized vertically.',
  components: [
    c(
      { Textarea },
      { placeholder: 'What changed in this release?', disabled: false },
    ),
  ],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 2, width: '360px', maxWidth: '100%' })}
    >
      <Label htmlFor="textarea-notes">Release notes</Label>
      <C.Textarea id="textarea-notes" />
    </div>
  ),
})
