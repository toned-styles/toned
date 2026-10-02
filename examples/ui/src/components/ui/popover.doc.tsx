import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Button } from './button.tsx'
import { Input } from './input.tsx'
import { Label } from './label.tsx'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from './popover.tsx'

export default doc({
  description:
    'A floating panel anchored to the button that opens it. It closes on Escape or a click outside.',
  components: [
    c({ Popover }, {}),
    c({ PopoverTrigger }, { asChild: true }),
    c({ PopoverContent }, { align: 'center', side: 'bottom' }),
    c({ PopoverTitle }, { children: 'Dimensions' }),
    c({ PopoverDescription }, { children: 'Set the size of the preview.' }),
  ],
  preview: (C) => (
    <C.Popover>
      <C.PopoverTrigger>
        <Button variant="outline">Edit dimensions</Button>
      </C.PopoverTrigger>
      <C.PopoverContent>
        <PopoverHeader>
          <C.PopoverTitle />
          <C.PopoverDescription />
        </PopoverHeader>
        <div
          {...t({
            display: 'grid',
            alignItems: 'center',
            gap: 2,
            // No token for grid tracks: a label column and a field column.
            '@platform web': { $style: { gridTemplateColumns: '4rem 1fr' } },
          })}
        >
          <Label htmlFor="popover-width">Width</Label>
          <Input id="popover-width" defaultValue="320px" />
          <Label htmlFor="popover-height">Height</Label>
          <Input id="popover-height" defaultValue="240px" />
        </div>
      </C.PopoverContent>
    </C.Popover>
  ),
})
