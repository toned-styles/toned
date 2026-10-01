import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Button } from './button.tsx'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer.tsx'

export default doc({
  description:
    'A panel that rises from the bottom of the screen and can be dragged down to dismiss. Suited to touch screens.',
  components: [
    c({ Drawer }, {}),
    c({ DrawerTrigger }, { asChild: true }),
    c({ DrawerContent }, {}),
    c({ DrawerHeader }, {}),
    c({ DrawerTitle }, { children: 'Share this release' }),
    c(
      { DrawerDescription },
      { children: 'Anyone with the link can read the release notes.' },
    ),
    c({ DrawerFooter }, {}),
  ],
  preview: (C) => (
    <C.Drawer>
      <C.DrawerTrigger>
        <Button variant="outline">Share release</Button>
      </C.DrawerTrigger>
      <C.DrawerContent>
        <div {...t({ width: '100%', maxWidth: '28rem', marginX: 'auto' })}>
          <C.DrawerHeader>
            <C.DrawerTitle />
            <C.DrawerDescription />
          </C.DrawerHeader>
          <C.DrawerFooter>
            <DrawerClose asChild>
              <Button>Copy link</Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </C.DrawerFooter>
        </div>
      </C.DrawerContent>
    </C.Drawer>
  ),
})
