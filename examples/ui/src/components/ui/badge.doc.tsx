import { doc, c } from '@/lib/doc'
import { Badge } from './badge'

export default doc({
  components: [
    c({ Badge }, { children: 'Badge', variant: 'default' }),
  ],
})
