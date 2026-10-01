import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Badge } from './badge.tsx'

export default doc({
  description:
    'A short label for a status or a count. Six appearances from one stylesheet.',
  components: [c({ Badge }, { children: 'In review', variant: 'default' })],
  preview: (C) => (
    <div
      {...t({
        flexLayout: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      })}
    >
      <C.Badge />
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">v2.4.0</Badge>
      <Badge variant="destructive">Failed</Badge>
    </div>
  ),
})
