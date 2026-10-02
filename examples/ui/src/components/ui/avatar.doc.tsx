import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from './avatar.tsx'

export default doc({
  description:
    'A picture or initials that stand for a person. Initials show while the image loads or when it fails.',
  components: [
    c({ Avatar }, { size: 'lg' }),
    c({ AvatarFallback }, { children: 'AM' }),
  ],
  preview: (C) => (
    <div {...t({ flexLayout: 'row', alignItems: 'center', gap: 8 })}>
      <div {...t({ flexLayout: 'row', alignItems: 'center', gap: 3 })}>
        <C.Avatar>
          <C.AvatarFallback />
          <AvatarBadge aria-label="Online" />
        </C.Avatar>
        <div {...t({ flexLayout: 'column' })}>
          <span {...t({ typo: 'label_small' })}>Alex Morgan</span>
          <span {...t({ typo: 'caption', textColor: 'muted' })}>Owner</span>
        </div>
      </div>
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>SR</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JL</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>TD</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+4</AvatarGroupCount>
      </AvatarGroup>
    </div>
  ),
})
