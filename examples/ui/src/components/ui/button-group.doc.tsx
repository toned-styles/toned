import { doc, c } from '@/lib/doc'
import { Button } from './button'
import { ButtonGroup } from './button-group'

export default doc({
  components: [
    c({ ButtonGroup }, {}),
  ],
  preview: (C) => (
    <C.ButtonGroup>
      <Button variant="outline">Left</Button>
      <Button variant="outline">Center</Button>
      <Button variant="outline">Right</Button>
    </C.ButtonGroup>
  ),
})
