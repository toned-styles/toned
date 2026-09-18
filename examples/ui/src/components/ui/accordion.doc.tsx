import { c, doc } from '@/lib/doc.tsx'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion.tsx'

export default doc({
  components: [
    c({ Accordion }, { type: 'single' as const, collapsible: true }),
    c({ AccordionItem }, { value: 'item-1' }),
    c({ AccordionTrigger }, { children: 'Is it accessible?' }),
    c(
      { AccordionContent },
      {
        children: 'Yes. It adheres to the WAI-ARIA design pattern.',
      },
    ),
  ],
  preview: (C) => (
    <C.Accordion>
      <C.AccordionItem>
        <C.AccordionTrigger />
        <C.AccordionContent />
      </C.AccordionItem>
    </C.Accordion>
  ),
})
