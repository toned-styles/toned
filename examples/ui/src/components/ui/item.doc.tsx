import { doc, c } from '@/lib/doc'
import { Item, ItemContent, ItemTitle, ItemDescription } from './item'

export default doc({
  components: [
    c({ Item }, {}),
    c({ ItemContent }, {}),
    c({ ItemTitle }, { children: 'Item Title' }),
    c({ ItemDescription }, { children: 'Item description text.' }),
  ],
  preview: (C) => (
    <C.Item>
      <C.ItemContent>
        <C.ItemTitle />
        <C.ItemDescription />
      </C.ItemContent>
    </C.Item>
  ),
})
