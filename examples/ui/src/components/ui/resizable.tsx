"use client"

import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"


const resizableStyles = stylesheet({
  group: {
    display: 'flex',
    height: '100%',
    width: '100%',
  },
  handle: {
    bgColor: 'subtle',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    style: {
      width: '1px',
    },
  },
  handleGrip: {
    bgColor: 'subtle',
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'small',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    style: {
      height: '1rem',
      width: '0.75rem',
    },
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
        <div {...s.handleGrip}>
          <GripVerticalIcon style={{ width: '0.625rem', height: '0.625rem' }} />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
