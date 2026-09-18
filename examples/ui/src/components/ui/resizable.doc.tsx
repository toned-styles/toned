import { c, doc } from '@/lib/doc.tsx'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './resizable.tsx'

export default doc({
  components: [
    c({ ResizablePanelGroup }, {}),
    c({ ResizablePanel }, {}),
    c({ ResizableHandle }, {}),
  ],
  preview: (C) => (
    <div style={{ width: '400px' }}>
      <C.ResizablePanelGroup>
        <C.ResizablePanel defaultSize={50}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100px',
              padding: '24px',
            }}
          >
            Panel 1
          </div>
        </C.ResizablePanel>
        <C.ResizableHandle withHandle />
        <C.ResizablePanel defaultSize={50}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100px',
              padding: '24px',
            }}
          >
            Panel 2
          </div>
        </C.ResizablePanel>
      </C.ResizablePanelGroup>
    </div>
  ),
})
