import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip.tsx'

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
