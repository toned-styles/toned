import { doc, c } from '@/lib/doc'
import { Input } from './input'
import { Field, FieldLabel, FieldDescription, FieldError } from './field'

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
