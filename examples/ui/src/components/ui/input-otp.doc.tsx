import { doc, c } from '@/lib/doc'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './input-otp'

export default doc({
  components: [
    c({ InputOTP }, { maxLength: 6 }),
    c({ InputOTPGroup }, {}),
    c({ InputOTPSlot }, { index: 0 }),
    c({ InputOTPSeparator }, {}),
  ],
  preview: (C) => (
    <C.InputOTP>
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
  ),
})
