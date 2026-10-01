import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'

export default doc({
  description:
    'Six appearances and eight sizes from one typed stylesheet. Change the props to see each variant.',
  components: [
    c(
      { Button },
      { children: 'Ship your idea', variant: 'default', size: 'default' },
    ),
  ],
})
