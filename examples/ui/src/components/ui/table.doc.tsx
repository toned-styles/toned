import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Badge } from './badge.tsx'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table.tsx'

const releases = [
  ['2.4.0', 'Container queries', 'Published'],
  ['2.3.1', 'Focus ring fix', 'Published'],
  ['2.5.0', 'Motion tokens', 'Draft'],
]

export default doc({
  description:
    'Rows and columns of data with a header, an optional footer and a caption. It scrolls sideways when it is wider than its container.',
  components: [
    c({ Table }, {}),
    c({ TableHeader }, {}),
    c({ TableBody }, {}),
    c({ TableRow }, {}),
    c({ TableHead }, {}),
    c({ TableCell }, {}),
    c({ TableCaption }, { children: 'The three most recent releases.' }),
  ],
  preview: (C) => (
    <div {...t({ width: '100%', maxWidth: '480px' })}>
      <C.Table>
        <C.TableCaption />
        <C.TableHeader>
          <C.TableRow>
            <C.TableHead>Version</C.TableHead>
            <C.TableHead>Change</C.TableHead>
            <C.TableHead>Status</C.TableHead>
          </C.TableRow>
        </C.TableHeader>
        <C.TableBody>
          {releases.map(([version, change, status]) => (
            <C.TableRow key={version}>
              <C.TableCell>{version}</C.TableCell>
              <C.TableCell>{change}</C.TableCell>
              <C.TableCell>
                <Badge variant={status === 'Draft' ? 'outline' : 'secondary'}>
                  {status}
                </Badge>
              </C.TableCell>
            </C.TableRow>
          ))}
        </C.TableBody>
      </C.Table>
    </div>
  ),
})
