import { c, doc } from '@/lib/doc.tsx'
import { Avatar, AvatarFallback, AvatarImage } from './avatar.tsx'

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
