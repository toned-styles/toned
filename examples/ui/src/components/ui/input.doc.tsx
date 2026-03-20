import { doc, c } from '@/lib/doc'
import { Input } from './input'

export default doc({
  components: [
    c({ Input }, { placeholder: 'Type something...' }),
  ],
})
