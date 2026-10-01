import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Kbd, KbdGroup } from './kbd.tsx'

export default doc({
  description: 'Shows a key or a keyboard shortcut inline with text.',
  components: [c({ Kbd }, { children: '⌘' }), c({ KbdGroup }, {})],
  preview: (C) => (
    <div
      {...t({
        flexLayout: 'row',
        alignItems: 'center',
        gap: 2,
        typo: 'body_small',
        textColor: 'muted',
      })}
    >
      Open the command menu
      <C.KbdGroup>
        <C.Kbd />
        <Kbd>K</Kbd>
      </C.KbdGroup>
    </div>
  ),
})
