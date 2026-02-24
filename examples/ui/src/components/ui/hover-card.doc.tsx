import { doc, c } from '@/lib/doc'
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card'

export default doc({
  components: [
    c({ HoverCard }, {}),
    c({ HoverCardTrigger }, { children: 'Hover me' }),
    c({ HoverCardContent }, { children: 'Content shown on hover.' }),
  ],
  preview: (C) => (
    <C.HoverCard>
      <C.HoverCardTrigger>
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>@nextjs</span>
      </C.HoverCardTrigger>
      <C.HoverCardContent />
    </C.HoverCard>
  ),
})
