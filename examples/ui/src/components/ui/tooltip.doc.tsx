import { doc, c } from '@/lib/doc'
import { Button } from './button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'

export default doc({
  components: [
    c({ TooltipProvider }, {}),
    c({ Tooltip }, {}),
    c({ TooltipTrigger }, { asChild: true }),
    c({ TooltipContent }, { children: 'Add to library' }),
  ],
  preview: (C) => (
    <C.TooltipProvider>
      <C.Tooltip>
        <C.TooltipTrigger>
          <Button variant="outline">Hover me</Button>
        </C.TooltipTrigger>
        <C.TooltipContent />
      </C.Tooltip>
    </C.TooltipProvider>
  ),
})
