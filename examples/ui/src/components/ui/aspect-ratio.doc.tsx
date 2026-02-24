import { doc, c } from '@/lib/doc'
import { AspectRatio } from './aspect-ratio'

export default doc({
  components: [
    c({ AspectRatio }, { ratio: 16 / 9 }),
  ],
  preview: (C) => (
    <div style={{ width: '300px' }}>
      <C.AspectRatio>
        <div style={{ width: '100%', height: '100%', background: 'var(--muted)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: '14px' }}>
          16:9
        </div>
      </C.AspectRatio>
    </div>
  ),
})
