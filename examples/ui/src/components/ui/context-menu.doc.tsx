import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from './context-menu.tsx'
import { Empty, EmptyDescription, EmptyTitle } from './empty.tsx'

export default doc({
  description:
    'A menu that opens where the pointer is, on right click or a long press.',
  components: [
    c({ ContextMenu }, {}),
    c({ ContextMenuTrigger }, { asChild: true }),
    c({ ContextMenuContent }, {}),
    c({ ContextMenuItem }, { children: 'Rename' }),
  ],
  preview: (C) => (
    <C.ContextMenu>
      <C.ContextMenuTrigger>
        <Empty {...t({ maxWidth: '320px' })}>
          <EmptyTitle>release-notes.md</EmptyTitle>
          <EmptyDescription>
            Right-click this area, or press and hold on a touch screen.
          </EmptyDescription>
        </Empty>
      </C.ContextMenuTrigger>
      <C.ContextMenuContent>
        <C.ContextMenuItem>
          Rename
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </C.ContextMenuItem>
        <ContextMenuItem>
          Copy path
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>Open in a new tab</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">Delete file</ContextMenuItem>
      </C.ContextMenuContent>
    </C.ContextMenu>
  ),
})
