import { doc, c } from '@/lib/doc'
import { Calendar } from './calendar'

export default doc({
  components: [
    c({ Calendar }, { mode: 'single' as const }),
  ],
})
