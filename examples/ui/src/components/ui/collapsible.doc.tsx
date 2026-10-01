import { t } from '@toned/systems/base'
import { ChevronsUpDownIcon } from 'lucide-react'

import { c, doc } from '@/lib/doc.tsx'

import { Button } from './button.tsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible.tsx'
import { Item } from './item.tsx'

export default doc({
  description:
    'A region that a button shows and hides. The content animates to and from its measured height.',
  components: [
    c({ Collapsible }, { defaultOpen: false }),
    c({ CollapsibleTrigger }, { asChild: true }),
    c({ CollapsibleContent }, {}),
  ],
  preview: (C) => (
    <div {...t({ width: '320px', maxWidth: '100%' })}>
      <C.Collapsible>
        <div {...t({ flexLayout: 'column', gap: 2 })}>
          <div
            {...t({
              flexLayout: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
            })}
          >
            <span {...t({ typo: 'label_small' })}>3 reviewers requested</span>
            <C.CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Show all reviewers"
              >
                <ChevronsUpDownIcon />
              </Button>
            </C.CollapsibleTrigger>
          </div>
          <Item variant="outline" size="sm">
            Alex Morgan
          </Item>
          <C.CollapsibleContent>
            <div {...t({ flexLayout: 'column', gap: 2 })}>
              <Item variant="outline" size="sm">
                Sam Rivera
              </Item>
              <Item variant="outline" size="sm">
                Jordan Lee
              </Item>
            </div>
          </C.CollapsibleContent>
        </div>
      </C.Collapsible>
    </div>
  ),
})
