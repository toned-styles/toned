import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { AspectRatio } from './aspect-ratio.tsx'

export default doc({
  description:
    'Keeps its content at a fixed width-to-height ratio as the width changes.',
  components: [c({ AspectRatio }, { ratio: 16 / 9 })],
  preview: (C) => (
    <div {...t({ width: '360px', maxWidth: '100%' })}>
      <C.AspectRatio>
        <div
          {...t({
            flexLayout: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            width: '100%',
            height: '100%',
            bgColor: 'action_secondary',
            textColor: 'on_action_secondary',
            borderRadius: 'large',
            typo: 'label_small',
          })}
        >
          16 : 9
          <span {...t({ typo: 'caption', textColor: 'muted' })}>
            Resize the window: the ratio holds
          </span>
        </div>
      </C.AspectRatio>
    </div>
  ),
})
