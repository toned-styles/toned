import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible.tsx'

export default doc({
  components: [
    c({ Collapsible }, {}),
    c({ CollapsibleTrigger }, { asChild: true }),
    c({ CollapsibleContent }, { children: 'Collapsible content goes here.' }),
  ],
  preview: (C) => (
    <C.Collapsible>
      <C.CollapsibleTrigger>
        <Button variant="outline" size="sm">
          Toggle
        </Button>
      </C.CollapsibleTrigger>
      <C.CollapsibleContent />
    </C.Collapsible>
  ),
})
