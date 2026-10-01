import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion.tsx'

export default doc({
  description:
    'Stacked headings that each reveal a section of content. One section or several can be open at a time.',
  components: [
    c(
      { Accordion },
      { type: 'single' as const, collapsible: true, defaultValue: 'tokens' },
    ),
    c({ AccordionItem }, { value: 'tokens' }),
    c({ AccordionTrigger }, { children: 'What is a design token?' }),
    c(
      { AccordionContent },
      {
        children:
          'A named design value, such as a colour, a radius or a spacing step. Stylesheets refer to tokens by name.',
      },
    ),
  ],
  preview: (C) => (
    <div {...t({ width: '400px', maxWidth: '100%' })}>
      <C.Accordion>
        <C.AccordionItem>
          <C.AccordionTrigger />
          <C.AccordionContent />
        </C.AccordionItem>
        <AccordionItem value="variants">
          <AccordionTrigger>How do variants work?</AccordionTrigger>
          <AccordionContent>
            A stylesheet declares its variants once. The component selects them
            with props such as size or appearance.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="keyboard">
          <AccordionTrigger>Is it keyboard accessible?</AccordionTrigger>
          <AccordionContent>
            Yes. Tab moves between headings and Enter or Space opens one.
          </AccordionContent>
        </AccordionItem>
      </C.Accordion>
    </div>
  ),
})
