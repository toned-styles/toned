import { t } from '@toned/systems/base'
import { useForm } from 'react-hook-form'

import { c, type DocParts, doc } from '@/lib/doc.tsx'

import { Button } from './button.tsx'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form.tsx'
import { Input } from './input.tsx'

function ProjectForm({ C }: { C: DocParts }) {
  const form = useForm({ defaultValues: { name: '' }, mode: 'onSubmit' })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(() => form.reset())}
        {...t({
          flexLayout: 'column',
          gap: 4,
          width: '100%',
          maxWidth: '340px',
        })}
      >
        <FormField
          control={form.control}
          name="name"
          rules={{
            required: 'Enter a project name.',
            minLength: { value: 3, message: 'Use at least three characters.' },
          }}
          render={({ field }) => (
            <C.FormItem>
              <C.FormLabel />
              <FormControl>
                <Input placeholder="Orbit workspace" {...field} />
              </FormControl>
              <C.FormDescription />
              <FormMessage />
            </C.FormItem>
          )}
        />
        <Button type="submit" {...t({ alignSelf: 'flex-start' })}>
          Create project
        </Button>
      </form>
    </Form>
  )
}

export default doc({
  description:
    'Connects fields to react-hook-form: each field gets its label, description and validation message wired together for assistive technology. Submit the empty form to see an error.',
  components: [
    c({ FormItem }, {}),
    c({ FormLabel }, { children: 'Project name' }),
    c({ FormDescription }, { children: 'Shown in the sidebar.' }),
  ],
  preview: (C) => <ProjectForm C={C} />,
})
