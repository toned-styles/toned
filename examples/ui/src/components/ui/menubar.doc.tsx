import { doc, c } from '@/lib/doc'
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator } from './menubar'

export default doc({
  components: [
    c({ Menubar }, {}),
    c({ MenubarMenu }, {}),
    c({ MenubarTrigger }, { children: 'File' }),
    c({ MenubarContent }, {}),
    c({ MenubarItem }, { children: 'New Tab' }),
    c({ MenubarSeparator }, {}),
  ],
  preview: (C) => (
    <C.Menubar>
      <C.MenubarMenu>
        <C.MenubarTrigger>File</C.MenubarTrigger>
        <C.MenubarContent>
          <C.MenubarItem>New Tab</C.MenubarItem>
          <C.MenubarItem>New Window</C.MenubarItem>
          <C.MenubarSeparator />
          <C.MenubarItem>Print</C.MenubarItem>
        </C.MenubarContent>
      </C.MenubarMenu>
      <C.MenubarMenu>
        <C.MenubarTrigger>Edit</C.MenubarTrigger>
        <C.MenubarContent>
          <C.MenubarItem>Undo</C.MenubarItem>
          <C.MenubarItem>Redo</C.MenubarItem>
        </C.MenubarContent>
      </C.MenubarMenu>
    </C.Menubar>
  ),
})
