import { c, doc } from '@/lib/doc.tsx'
import { InputGroup, InputGroupInput, InputGroupText } from './input-group.tsx'

export default doc({
  components: [
    c({ InputGroup }, {}),
    c({ InputGroupInput }, { placeholder: 'Amount' }),
    c({ InputGroupText }, { children: '$' }),
  ],
  preview: (C) => (
    <div style={{ width: '250px' }}>
      <C.InputGroup>
        <C.InputGroupText>$</C.InputGroupText>
        <C.InputGroupInput />
      </C.InputGroup>
    </div>
  ),
})
