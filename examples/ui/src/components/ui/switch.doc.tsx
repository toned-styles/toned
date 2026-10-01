import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Label } from './label.tsx'
import { Switch } from './switch.tsx'

export default doc({
  description:
    'An on/off control for a setting that takes effect immediately. Two sizes.',
  components: [
    c({ Switch }, { defaultChecked: true, size: 'default', disabled: false }),
  ],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 4, width: '280px', maxWidth: '100%' })}
    >
      <div
        {...t({
          flexLayout: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        })}
      >
        <Label htmlFor="switch-notifications">Release notifications</Label>
        <C.Switch id="switch-notifications" />
      </div>
      <div
        {...t({
          flexLayout: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        })}
      >
        <Label htmlFor="switch-preview">Preview features</Label>
        <Switch id="switch-preview" />
      </div>
    </div>
  ),
})
