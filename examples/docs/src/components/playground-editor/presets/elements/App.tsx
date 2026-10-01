import { createElements } from '@toned/react'
import { useState } from 'react'
import { type NoticeVariants, noticeStyles } from './styles.ts'

// Bind the sheet once, at module scope. `Notice` is the family: it takes the
// variants and renders no element of its own. `Notice.Root`, `Notice.Title`
// and the rest are stable components, one per part.
const Notice = createElements(noticeStyles)

// A part finds its family through context, so this nested component needs no
// styling props. Its count survives a variant change, because the part
// component keeps its identity. Click it, then switch the tone.
function Acknowledge() {
  const [count, setCount] = useState(0)
  return (
    <Notice.Action
      as="button"
      type="button"
      onClick={() => setCount((value) => value + 1)}
    >
      Acknowledge · {count}
    </Notice.Action>
  )
}

// The variant controls above the preview pass their values in as props.
export default function App(variants: Partial<NoticeVariants>) {
  return (
    <Notice {...variants}>
      <Notice.Root as="section">
        <Notice.Badge as="span">{variants.tone ?? 'info'}</Notice.Badge>
        <Notice.Title as="h3">Build finished</Notice.Title>
        <Notice.Message as="p">
          Variants go on the family, once. Every part reads them from there:
          nothing is spread, and nothing is passed down.
        </Notice.Message>
        <Acknowledge />
      </Notice.Root>
    </Notice>
  )
}
