import { t } from '@toned/systems/base'
import { ArrowUpIcon, SearchIcon } from 'lucide-react'

import { c, doc } from '@/lib/doc.tsx'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from './input-group.tsx'

export default doc({
  description:
    'A field with icons, text or buttons inside its border. The group draws the border and the focus ring for everything in it.',
  components: [
    c({ InputGroup }, {}),
    c(
      { InputGroupInput },
      { placeholder: 'Search components', 'aria-label': 'Search' },
    ),
    c({ InputGroupAddon }, { align: 'inline-start' }),
  ],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 4, width: '100%', maxWidth: '360px' })}
    >
      <C.InputGroup>
        <C.InputGroupInput />
        <C.InputGroupAddon>
          <SearchIcon />
        </C.InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupText>56 results</InputGroupText>
        </InputGroupAddon>
      </C.InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="example" aria-label="Subdomain" />
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupText>.toned.style</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea
          placeholder="Write a comment"
          aria-label="Comment"
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>Markdown is supported</InputGroupText>
          <InputGroupButton
            variant="default"
            size="icon-xs"
            aria-label="Send comment"
            {...t({ marginLeft: 'auto', borderRadius: 'full' })}
          >
            <ArrowUpIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
})
