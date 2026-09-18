import { c, doc } from '@/lib/doc.tsx'
import { Calendar } from './calendar.tsx'

export default doc({
  components: [c({ Calendar }, { mode: 'single' as const })],
})
