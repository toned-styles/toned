import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Skeleton } from './skeleton.tsx'

export default doc({
  description:
    'A pulsing placeholder that holds the shape of content while it loads.',
  components: [c({ Skeleton }, {})],
  preview: (C) => (
    <div {...t({ flexLayout: 'row', alignItems: 'center', gap: 4 })}>
      <C.Skeleton {...t({ width: 12, height: 12, borderRadius: 'full' })} />
      <div {...t({ flexLayout: 'column', gap: 2 })}>
        <C.Skeleton {...t({ width: 56, height: 4 })} />
        <C.Skeleton {...t({ width: 40, height: 4 })} />
      </div>
    </div>
  ),
})
