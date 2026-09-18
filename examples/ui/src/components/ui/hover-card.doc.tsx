import { c, doc } from '@/lib/doc.tsx'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card.tsx'

export default doc({
  components: [
    c({ HoverCard }, {}),
    c({ HoverCardTrigger }, { children: 'Hover me' }),
    c({ HoverCardContent }, { children: 'Content shown on hover.' }),
  ],
  preview: (C) => (
    <C.HoverCard>
      <C.HoverCardTrigger>
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>
          @nextjs
        </span>
      </C.HoverCardTrigger>
      <C.HoverCardContent />
    </C.HoverCard>
  ),
})
