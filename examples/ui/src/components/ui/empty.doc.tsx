import { c, doc } from '@/lib/doc.tsx'
import { Empty, EmptyDescription, EmptyTitle } from './empty.tsx'

export default doc({
  components: [
    c({ Empty }, {}),
    c({ EmptyTitle }, { children: 'No results found' }),
    c(
      { EmptyDescription },
      { children: 'Try adjusting your search or filters.' },
    ),
  ],
  preview: (C) => (
    <C.Empty>
      <C.EmptyTitle />
      <C.EmptyDescription />
    </C.Empty>
  ),
})
