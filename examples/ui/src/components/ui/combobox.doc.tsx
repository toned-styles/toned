import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from './combobox.tsx'

const frameworks = [
  'React',
  'React Native',
  'Next.js',
  'Remix',
  'Astro',
  'Expo',
  'TanStack Start',
]

export default doc({
  description:
    'A text field that filters a list of options as you type. Choose with the arrow keys and Enter.',
  components: [
    c({ Combobox }, { items: frameworks }),
    c(
      { ComboboxInput },
      {
        placeholder: 'Choose a framework',
        'aria-label': 'Framework',
        showClear: false,
      },
    ),
    c({ ComboboxContent }, {}),
    c({ ComboboxList }, {}),
    c({ ComboboxEmpty }, { children: 'No framework matches.' }),
  ],
  preview: (C) => (
    <div {...t({ width: '100%', maxWidth: '280px' })}>
      <C.Combobox>
        <C.ComboboxInput />
        <C.ComboboxContent>
          <C.ComboboxEmpty />
          <C.ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </C.ComboboxList>
        </C.ComboboxContent>
      </C.Combobox>
    </div>
  ),
})
