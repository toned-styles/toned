import { doc, c } from '@/lib/doc'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'

export default doc({
  components: [
    c({ Avatar }, {}),
    c({ AvatarImage }, { src: 'https://github.com/shadcn.png', alt: 'User' }),
    c({ AvatarFallback }, { children: 'CN' }),
  ],
  preview: (C) => (
    <C.Avatar>
      <C.AvatarImage />
      <C.AvatarFallback />
    </C.Avatar>
  ),
})
