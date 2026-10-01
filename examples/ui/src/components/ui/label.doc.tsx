import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Input } from './input.tsx'
import { Label } from './label.tsx'

export default doc({
  description:
    'Names a form control. Clicking the label moves focus to the control it is bound to.',
  components: [c({ Label }, { children: 'Email address' })],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 2, width: '320px', maxWidth: '100%' })}
    >
      <C.Label htmlFor="label-email" />
      <Input id="label-email" type="email" placeholder="you@example.com" />
    </div>
  ),
})
