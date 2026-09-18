import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import { ButtonGroup } from './button-group.tsx'

export default doc({
  components: [c({ ButtonGroup }, {})],
  preview: (C) => (
    <C.ButtonGroup>
      <Button variant="outline">Left</Button>
      <Button variant="outline">Center</Button>
      <Button variant="outline">Right</Button>
    </C.ButtonGroup>
  ),
})
