import { doc, c } from '@/lib/doc'
import { Toggle } from './toggle'

export default doc({
  components: [
    c({ Toggle }, { children: 'Bold', variant: 'outline' }),
  ],
})
