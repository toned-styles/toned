import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from 'lucide-react'

import { c, doc } from '@/lib/doc.tsx'

import { ToggleGroup, ToggleGroupItem } from './toggle-group.tsx'

export default doc({
  description:
    'A row of toggles that share one value. `type` selects single or multiple selection.',
  components: [
    c(
      { ToggleGroup },
      {
        type: 'single' as const,
        defaultValue: 'left',
        variant: 'outline',
        size: 'default',
        'aria-label': 'Text alignment',
      },
    ),
    c({ ToggleGroupItem }, { value: 'left' }),
  ],
  preview: (C) => (
    <C.ToggleGroup>
      <C.ToggleGroupItem value="left" aria-label="Align left">
        <AlignLeftIcon />
      </C.ToggleGroupItem>
      <C.ToggleGroupItem value="center" aria-label="Align centre">
        <AlignCenterIcon />
      </C.ToggleGroupItem>
      <C.ToggleGroupItem value="right" aria-label="Align right">
        <AlignRightIcon />
      </C.ToggleGroupItem>
    </C.ToggleGroup>
  ),
})
