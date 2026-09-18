import { c, doc } from '@/lib/doc.tsx'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './context-menu.tsx'

export default doc({
  components: [
    c({ ContextMenu }, {}),
    c({ ContextMenuTrigger }, {}),
    c({ ContextMenuContent }, {}),
    c({ ContextMenuItem }, { children: 'Edit' }),
  ],
  preview: (C) => (
    <C.ContextMenu>
      <C.ContextMenuTrigger>
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            padding: '32px',
            textAlign: 'center',
            color: 'var(--muted-foreground)',
            fontSize: '14px',
          }}
        >
          Right click here
        </div>
      </C.ContextMenuTrigger>
      <C.ContextMenuContent>
        <C.ContextMenuItem>Edit</C.ContextMenuItem>
        <C.ContextMenuItem>Copy</C.ContextMenuItem>
        <C.ContextMenuItem>Delete</C.ContextMenuItem>
      </C.ContextMenuContent>
    </C.ContextMenu>
  ),
})
