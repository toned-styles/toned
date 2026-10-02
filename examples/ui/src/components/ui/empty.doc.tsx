import { t } from '@toned/systems/base'
import { FolderOpenIcon } from 'lucide-react'

import { c, doc } from '@/lib/doc.tsx'

import { Button } from './button.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './empty.tsx'

export default doc({
  description:
    'Fills a view that has no content yet: what is missing, why, and what to do next.',
  components: [
    c({ Empty }, {}),
    c({ EmptyHeader }, {}),
    c({ EmptyMedia }, { variant: 'icon' }),
    c({ EmptyTitle }, { children: 'No projects yet' }),
    c(
      { EmptyDescription },
      { children: 'Create a project to start tracking its releases.' },
    ),
    c({ EmptyContent }, {}),
  ],
  preview: (C) => (
    <div {...t({ width: '100%', maxWidth: '440px' })}>
      <C.Empty>
        <C.EmptyHeader>
          <C.EmptyMedia>
            <FolderOpenIcon />
          </C.EmptyMedia>
          <C.EmptyTitle />
          <C.EmptyDescription />
        </C.EmptyHeader>
        <C.EmptyContent>
          <Button>Create project</Button>
          <Button variant="outline">Import</Button>
        </C.EmptyContent>
      </C.Empty>
    </div>
  ),
})
