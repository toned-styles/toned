import { t } from '@toned/systems/base'
import { useState } from 'react'
import { c, type DocParts, doc } from '@/lib/doc.tsx'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from './input-otp.tsx'
import { Label } from './label.tsx'

function CodeField({ C }: { C: DocParts }) {
  const [value, setValue] = useState('482')
  return (
    <C.InputOTP value={value} onChange={setValue}>
      <C.InputOTPGroup>
        <C.InputOTPSlot index={0} />
        <C.InputOTPSlot index={1} />
        <C.InputOTPSlot index={2} />
      </C.InputOTPGroup>
      <C.InputOTPSeparator />
      <C.InputOTPGroup>
        <C.InputOTPSlot index={3} />
        <C.InputOTPSlot index={4} />
        <C.InputOTPSlot index={5} />
      </C.InputOTPGroup>
    </C.InputOTP>
  )
}

export default doc({
  description:
    'A one-time code field with a box for each character. It accepts a pasted code and moves between boxes as you type.',
  components: [
    c({ InputOTP }, { maxLength: 6, id: 'otp-code' }),
    c({ InputOTPGroup }, {}),
    c({ InputOTPSlot }, { index: 0 }),
    c({ InputOTPSeparator }, {}),
  ],
  preview: (C) => (
    <div {...t({ flexLayout: 'column', alignItems: 'center', gap: 3 })}>
      <Label htmlFor="otp-code">Verification code</Label>
      <CodeField C={C} />
      <span {...t({ typo: 'caption', textColor: 'muted' })}>
        Enter the six digits we sent to your phone.
      </span>
    </div>
  ),
})
