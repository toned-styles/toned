'use client'

import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { GripVerticalIcon } from 'lucide-react'
import * as ResizablePrimitive from 'react-resizable-panels'

/*
 * The handle is a one-pixel line. A vertical group turns it on its side:
 * that depends on the group's direction attribute, so it is in styles.css.
 */
export const resizableStyles = stylesheet({
  group: {
    display: 'flex',
    height: '100%',
    width: '100%',
  },
  handle: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    width: '1px',
    bgColor: 'interactive_muted',
    // No token: the transition list is specific to this part.
    style: { transition: 'background-color 0.15s, box-shadow 0.15s' },
    ':hover': { bgColor: 'action' },
    ':focus-visible': { bgColor: 'action', shadow: 'focus' },
  },
  handleGrip: {
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '0.75rem',
    height: '1.25rem',
    bgColor: 'elevated',
    textColor: 'muted',
    borderColor: 'input',
    borderWidth: 'thin',
    borderRadius: 'small',
  },
  gripIcon: {
    width: '0.625rem',
    height: '0.625rem',
  },
})

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  const s = useStyles(resizableStyles)

  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      {...s.group.with({ className })}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean
}) {
  const s = useStyles(resizableStyles)

  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      {...s.handle.with({ className })}
      {...props}
    >
      {withHandle && (
        <div data-slot="resizable-handle-grip" {...s.handleGrip}>
          <GripVerticalIcon {...s.gripIcon} />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
