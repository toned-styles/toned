import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Separator } from './separator.tsx'

export default doc({
  description:
    'A one-pixel rule between groups of content, horizontal or vertical.',
  components: [c({ Separator }, { orientation: 'horizontal' })],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 4, width: '320px', maxWidth: '100%' })}
    >
      <div {...t({ flexLayout: 'column', gap: 1 })}>
        <span {...t({ typo: 'label_small' })}>Toned UI</span>
        <span {...t({ typo: 'body_small', textColor: 'muted' })}>
          A collection of composable components.
        </span>
      </div>
      <C.Separator />
      <div
        {...t({
          flexLayout: 'row',
          alignItems: 'center',
          gap: 4,
          height: 5,
          typo: 'body_small',
        })}
      >
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Source</span>
        <Separator orientation="vertical" />
        <span>Changelog</span>
      </div>
    </div>
  ),
})
