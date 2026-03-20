import { doc, c } from '@/lib/doc'
import { ScrollArea } from './scroll-area'
import { Separator } from './separator'

export default doc({
  components: [
    c({ ScrollArea }, {}),
  ],
  preview: (C) => (
    <C.ScrollArea style={{ height: '200px', width: '200px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <div style={{ padding: '16px' }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i}>
            <div style={{ fontSize: '14px', padding: '4px 0' }}>Item {i + 1}</div>
            {i < 19 && <Separator />}
          </div>
        ))}
      </div>
    </C.ScrollArea>
  ),
})
