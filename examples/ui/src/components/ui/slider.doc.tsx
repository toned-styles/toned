import { doc, c } from '@/lib/doc'
import { Slider } from './slider'

export default doc({
  components: [
    c({ Slider }, { defaultValue: [50], max: 100, step: 1 }),
  ],
})
