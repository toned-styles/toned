import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu.tsx'

export default doc({
  components: [
    c({ DropdownMenu }, {}),
    c({ DropdownMenuTrigger }, { asChild: true }),
    c({ DropdownMenuContent }, {}),
    c({ DropdownMenuItem }, { children: 'Profile' }),
    c({ DropdownMenuLabel }, { children: 'My Account' }),
    c({ DropdownMenuSeparator }, {}),
  ],
  preview: (C) => (
    <C.DropdownMenu>
      <C.DropdownMenuTrigger>
        <Button variant="outline">Open Menu</Button>
      </C.DropdownMenuTrigger>
      <C.DropdownMenuContent>
        <C.DropdownMenuLabel />
        <C.DropdownMenuSeparator />
        <C.DropdownMenuItem>Profile</C.DropdownMenuItem>
        <C.DropdownMenuItem>Settings</C.DropdownMenuItem>
        <C.DropdownMenuItem>Logout</C.DropdownMenuItem>
      </C.DropdownMenuContent>
    </C.DropdownMenu>
  ),
})
