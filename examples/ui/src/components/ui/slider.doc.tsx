import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import { Label } from './label.tsx'
import { Slider } from './slider.tsx'

export default doc({
  description:
    'Picks a value, or a range with two thumbs, by dragging or with the arrow keys.',
  components: [
    c(
      { Slider },
      {
        defaultValue: [60],
        max: 100,
        step: 1,
        disabled: false,
        'aria-label': 'Volume',
      },
    ),
  ],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 6, width: '320px', maxWidth: '100%' })}
    >
      <div {...t({ flexLayout: 'column', gap: 3 })}>
        <Label>Volume</Label>
        <C.Slider />
      </div>
      <div {...t({ flexLayout: 'column', gap: 3 })}>
        <Label>Price range</Label>
        <Slider defaultValue={[20, 75]} max={100} step={5} />
      </div>
    </div>
  ),
})
