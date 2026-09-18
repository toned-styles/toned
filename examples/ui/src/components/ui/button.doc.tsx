import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'

export default doc({
  components: [
    c(
      { Button },
      { children: 'Click me', variant: 'default', size: 'default' },
    ),
  ],
})
