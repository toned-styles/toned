import { doc, c } from '@/lib/doc'
import { Textarea } from './textarea'

export default doc({
  components: [
    c({ Textarea }, { placeholder: 'Type your message...' }),
  ],
})
