import { useState } from 'react'

import { c, doc } from '@/lib/doc.tsx'

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from './menubar.tsx'

// A checkbox item is controlled: the menu owns no state of its own.
function ViewOption({
  label,
  initial = false,
}: {
  label: string
  initial?: boolean
}) {
  const [checked, setChecked] = useState(initial)
  return (
    <MenubarCheckboxItem checked={checked} onCheckedChange={setChecked}>
      {label}
    </MenubarCheckboxItem>
  )
}

export default doc({
  description:
    'A row of menus, as in a desktop application. Once one menu is open, the left and right arrow keys move between them.',
  components: [
    c({ Menubar }, {}),
    c({ MenubarMenu }, {}),
    c({ MenubarTrigger }, { children: 'File' }),
    c({ MenubarContent }, {}),
    c({ MenubarItem }, { children: 'New file' }),
    c({ MenubarSeparator }, {}),
  ],
  preview: (C) => (
    <C.Menubar>
      <C.MenubarMenu>
        <C.MenubarTrigger>File</C.MenubarTrigger>
        <C.MenubarContent>
          <C.MenubarItem>
            New file
            <MenubarShortcut>⌘N</MenubarShortcut>
          </C.MenubarItem>
          <MenubarItem>
            Open
            <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          <C.MenubarSeparator />
          <MenubarItem>
            Print
            <MenubarShortcut>⌘P</MenubarShortcut>
          </MenubarItem>
        </C.MenubarContent>
      </C.MenubarMenu>
      <C.MenubarMenu>
        <C.MenubarTrigger>Edit</C.MenubarTrigger>
        <C.MenubarContent>
          <MenubarItem>
            Undo
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Redo
            <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>
        </C.MenubarContent>
      </C.MenubarMenu>
      <C.MenubarMenu>
        <C.MenubarTrigger>View</C.MenubarTrigger>
        <C.MenubarContent>
          <ViewOption label="Show sidebar" initial />
          <ViewOption label="Show line numbers" />
        </C.MenubarContent>
      </C.MenubarMenu>
    </C.Menubar>
  ),
})
