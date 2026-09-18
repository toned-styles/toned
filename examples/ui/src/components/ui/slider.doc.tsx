import { c, doc } from '@/lib/doc.tsx'
import { Slider } from './slider.tsx'

export default doc({
  components: [c({ Slider }, { defaultValue: [50], max: 100, step: 1 })],
})
