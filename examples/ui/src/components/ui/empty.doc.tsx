import { doc, c } from '@/lib/doc'
import { Empty, EmptyTitle, EmptyDescription } from './empty'

export default doc({
  components: [
    c({ Empty }, {}),
    c({ EmptyTitle }, { children: 'No results found' }),
    c({ EmptyDescription }, { children: 'Try adjusting your search or filters.' }),
  ],
  preview: (C) => (
    <C.Empty>
      <C.EmptyTitle />
      <C.EmptyDescription />
    </C.Empty>
  ),
})
