import { t } from '@toned/systems/base'
import { Fragment } from 'react'
import { c, doc } from '@/lib/doc.tsx'
import { ScrollArea } from './scroll-area.tsx'
import { Separator } from './separator.tsx'

const versions = Array.from({ length: 14 }, (_, index) => `v2.${14 - index}.0`)

export default doc({
  description:
    'A scrolling region with a styled scrollbar that looks the same in every browser. It still scrolls natively.',
  components: [c({ ScrollArea }, { type: 'always' })],
  preview: (C) => (
    <C.ScrollArea
      {...t({
        height: '14rem',
        width: '14rem',
        bgColor: 'elevated',
        borderColor: 'default',
        borderWidth: 'thin',
        borderRadius: 'large',
      })}
    >
      <div {...t({ flexLayout: 'column', gap: 2, padding: 4 })}>
        <span {...t({ typo: 'label_small' })}>Versions</span>
        {versions.map((version, index) => (
          <Fragment key={version}>
            {index > 0 && <Separator />}
            <span {...t({ typo: 'body_small', textColor: 'muted' })}>
              {version}
            </span>
          </Fragment>
        ))}
      </div>
    </C.ScrollArea>
  ),
})
