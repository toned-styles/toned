import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './popover.tsx'

export default doc({
  components: [
    c({ Popover }, {}),
    c({ PopoverTrigger }, { asChild: true }),
    c({ PopoverContent }, { children: 'Place content for the popover here.' }),
  ],
  preview: (C) => (
    <C.Popover>
      <C.PopoverTrigger>
        <Button variant="outline">Open Popover</Button>
      </C.PopoverTrigger>
      <C.PopoverContent />
    </C.Popover>
  ),
})
