import { t } from '@toned/systems/base'
import { PackageIcon, ShieldCheckIcon } from 'lucide-react'
import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from './item.tsx'

export default doc({
  description:
    'A row with optional media, a title, a description and actions. Use it for lists of settings, files or people.',
  components: [
    c({ Item }, { variant: 'outline', size: 'default' }),
    c({ ItemMedia }, { variant: 'icon' }),
    c({ ItemContent }, {}),
    c({ ItemTitle }, { children: 'Two-factor authentication' }),
    c(
      { ItemDescription },
      { children: 'Ask for a code from your phone when you sign in.' },
    ),
    c({ ItemActions }, {}),
  ],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 3, width: '100%', maxWidth: '440px' })}
    >
      <C.Item>
        <C.ItemMedia>
          <ShieldCheckIcon />
        </C.ItemMedia>
        <C.ItemContent>
          <C.ItemTitle />
          <C.ItemDescription />
        </C.ItemContent>
        <C.ItemActions>
          <Button variant="outline" size="sm">
            Enable
          </Button>
        </C.ItemActions>
      </C.Item>
      <Item variant="muted" size="sm">
        <ItemMedia variant="icon">
          <PackageIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Version 2.4.0</ItemTitle>
          <ItemDescription>Published two days ago.</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
})
