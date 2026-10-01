import { t } from '@toned/systems/base'
import { ChevronDownIcon } from 'lucide-react'
import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import { ButtonGroup } from './button-group.tsx'

export default doc({
  description:
    'Joins related buttons into one control with shared borders and corners.',
  components: [c({ ButtonGroup }, { orientation: 'horizontal' })],
  preview: (C) => (
    <div
      {...t({
        flexLayout: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      })}
    >
      <C.ButtonGroup aria-label="Period">
        <Button variant="outline">Day</Button>
        <Button variant="outline">Week</Button>
        <Button variant="outline">Month</Button>
      </C.ButtonGroup>
      <ButtonGroup aria-label="Merge">
        <Button>Merge</Button>
        <Button size="icon" aria-label="More merge options">
          <ChevronDownIcon />
        </Button>
      </ButtonGroup>
    </div>
  ),
})
