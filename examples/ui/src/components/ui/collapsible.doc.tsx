import { doc, c } from '@/lib/doc'
import { Button } from './button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible'

export default doc({
  components: [
    c({ Collapsible }, {}),
    c({ CollapsibleTrigger }, { asChild: true }),
    c({ CollapsibleContent }, { children: 'Collapsible content goes here.' }),
  ],
  preview: (C) => (
    <C.Collapsible>
      <C.CollapsibleTrigger>
        <Button variant="outline" size="sm">Toggle</Button>
      </C.CollapsibleTrigger>
      <C.CollapsibleContent />
    </C.Collapsible>
  ),
})
