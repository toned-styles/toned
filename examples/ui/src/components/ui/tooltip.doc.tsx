import { CopyIcon } from 'lucide-react'
import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip.tsx'

export default doc({
  description:
    'A short label that appears when a control is hovered or focused. Use it to name icon-only buttons.',
  components: [
    c({ TooltipProvider }, { delayDuration: 200 }),
    c({ Tooltip }, {}),
    c({ TooltipTrigger }, { asChild: true }),
    c({ TooltipContent }, { children: 'Copy link', side: 'top' }),
  ],
  preview: (C) => (
    <C.TooltipProvider>
      <C.Tooltip>
        <C.TooltipTrigger>
          <Button variant="outline" size="icon" aria-label="Copy link">
            <CopyIcon />
          </Button>
        </C.TooltipTrigger>
        <C.TooltipContent />
      </C.Tooltip>
    </C.TooltipProvider>
  ),
})
