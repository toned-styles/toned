import { doc, c } from '@/lib/doc'
import { Label } from './label'

export default doc({
  components: [
    c({ Label }, { children: 'Email address' }),
  ],
})
