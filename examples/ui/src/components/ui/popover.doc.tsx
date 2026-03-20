import { doc, c } from '@/lib/doc'
import { Button } from './button'
import { Popover, PopoverTrigger, PopoverContent } from './popover'

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
