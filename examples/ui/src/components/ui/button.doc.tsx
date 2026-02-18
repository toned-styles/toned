import { doc, c } from '@/lib/doc'
import { Button } from './button'

export default doc({
  components: [
    c({ Button }, { children: 'Click me', variant: 'default', size: 'default' }),
  ],
})
