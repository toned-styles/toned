import { doc, c } from '@/lib/doc'
import { Button } from './button'
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from './drawer'

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
