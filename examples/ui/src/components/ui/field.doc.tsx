import { c, doc } from '@/lib/doc.tsx'
import { Field, FieldDescription, FieldError, FieldLabel } from './field.tsx'
import { Input } from './input.tsx'

export default doc({
  components: [
    c({ Field }, {}),
    c({ FieldLabel }, { children: 'Email' }),
    c({ FieldDescription }, { children: 'Enter your email address.' }),
    c({ FieldError }, { children: 'Email is required.' }),
  ],
  preview: (C) => (
    <C.Field>
      <C.FieldLabel />
      <Input placeholder="you@example.com" />
      <C.FieldDescription />
    </C.Field>
  ),
})
