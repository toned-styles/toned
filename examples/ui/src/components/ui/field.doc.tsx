import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from './field.tsx'
import { Input } from './input.tsx'

export default doc({
  description:
    'Lays out a form control with its label, help text and error message, stacked or side by side.',
  components: [
    c({ Field }, { orientation: 'vertical' }),
    c({ FieldLabel }, { children: 'Email', htmlFor: 'field-email' }),
    c(
      { FieldDescription },
      { children: 'We only use it to send release notes.' },
    ),
    c({ FieldError }, { children: 'Enter a name for the project.' }),
  ],
  preview: (C) => (
    <div {...t({ width: '100%', maxWidth: '340px' })}>
      <FieldGroup>
        <C.Field>
          <C.FieldLabel />
          <Input id="field-email" type="email" placeholder="you@example.com" />
          <C.FieldDescription />
        </C.Field>
        <C.Field>
          <FieldLabel htmlFor="field-project">Project name</FieldLabel>
          <Input
            id="field-project"
            aria-invalid="true"
            aria-describedby="field-project-error"
            defaultValue=""
          />
          <C.FieldError id="field-project-error" />
        </C.Field>
      </FieldGroup>
    </div>
  ),
})
