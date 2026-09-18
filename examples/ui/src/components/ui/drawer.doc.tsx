import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer.tsx'

export default doc({
  components: [
    c({ Drawer }, {}),
    c({ DrawerTrigger }, { asChild: true }),
    c({ DrawerContent }, {}),
    c({ DrawerHeader }, {}),
    c({ DrawerTitle }, { children: 'Drawer Title' }),
    c({ DrawerDescription }, { children: 'Drawer description goes here.' }),
  ],
  preview: (C) => (
    <C.Drawer>
      <C.DrawerTrigger>
        <Button variant="outline">Open Drawer</Button>
      </C.DrawerTrigger>
      <C.DrawerContent>
        <C.DrawerHeader>
          <C.DrawerTitle />
          <C.DrawerDescription />
        </C.DrawerHeader>
      </C.DrawerContent>
    </C.Drawer>
  ),
})
