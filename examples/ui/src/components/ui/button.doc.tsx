import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'

export default doc({
  description:
    'Six appearances and eight sizes, backed by one typed stylesheet. Change the props, inspect the variants, then make it yours.',
  components: [
    c(
      { Button },
      { children: 'Ship your idea', variant: 'default', size: 'default' },
    ),
  ],
})
