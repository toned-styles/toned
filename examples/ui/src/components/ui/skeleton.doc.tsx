import { c, doc } from '@/lib/doc.tsx'
import { Skeleton } from './skeleton.tsx'

export default doc({
  components: [c({ Skeleton }, {})],
  preview: (C) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '200px',
      }}
    >
      <C.Skeleton style={{ height: '20px', width: '100%' }} />
      <C.Skeleton style={{ height: '20px', width: '80%' }} />
      <C.Skeleton style={{ height: '20px', width: '60%' }} />
    </div>
  ),
})
