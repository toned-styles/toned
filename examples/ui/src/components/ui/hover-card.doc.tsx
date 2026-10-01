import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Avatar, AvatarFallback } from './avatar.tsx'
import { Button } from './button.tsx'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card.tsx'

export default doc({
  description:
    'A preview card that appears when a link is hovered or focused, for extra detail that is not essential.',
  components: [
    c({ HoverCard }, { openDelay: 200, closeDelay: 100 }),
    c({ HoverCardTrigger }, { asChild: true }),
    c({ HoverCardContent }, { align: 'center', side: 'bottom' }),
  ],
  preview: (C) => (
    <C.HoverCard>
      <C.HoverCardTrigger>
        <Button variant="link">@alexmorgan</Button>
      </C.HoverCardTrigger>
      <C.HoverCardContent>
        <div {...t({ flexLayout: 'row', gap: 3 })}>
          <Avatar size="lg">
            <AvatarFallback>AM</AvatarFallback>
          </Avatar>
          <div {...t({ flexLayout: 'column', gap: 1 })}>
            <span {...t({ typo: 'label_small' })}>Alex Morgan</span>
            <span {...t({ textColor: 'muted' })}>
              Maintains the Orbit workspace. Joined in March 2024.
            </span>
          </div>
        </div>
      </C.HoverCardContent>
    </C.HoverCard>
  ),
})
