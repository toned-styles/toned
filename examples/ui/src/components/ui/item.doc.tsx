import { c, doc } from '@/lib/doc.tsx'
import { Item, ItemContent, ItemDescription, ItemTitle } from './item.tsx'

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
