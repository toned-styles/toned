import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './resizable.tsx'

const pane = t({
  flexLayout: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  height: '100%',
  padding: 4,
  typo: 'label_small',
})
const hint = t({ typo: 'caption', textColor: 'muted' })

export default doc({
  description:
    'Panels that share a space and are resized by dragging the handle between them, or with the arrow keys when it has focus.',
  components: [
    c({ ResizablePanelGroup }, { orientation: 'horizontal' }),
    c({ ResizablePanel }, {}),
    c({ ResizableHandle }, { withHandle: true }),
  ],
  preview: (C) => (
    <div {...t({ width: '100%', maxWidth: '440px', height: '11rem' })}>
      <C.ResizablePanelGroup
        {...t({
          bgColor: 'elevated',
          borderColor: 'default',
          borderWidth: 'thin',
          borderRadius: 'large',
          overflow: 'hidden',
        })}
      >
        <C.ResizablePanel defaultSize="35%" minSize="20%">
          <div {...pane}>
            Files
            <span {...hint}>35%</span>
          </div>
        </C.ResizablePanel>
        <C.ResizableHandle />
        <C.ResizablePanel defaultSize="65%" minSize="30%">
          <div {...pane}>
            Editor
            <span {...hint}>Drag the handle</span>
          </div>
        </C.ResizablePanel>
      </C.ResizablePanelGroup>
    </div>
  ),
})
