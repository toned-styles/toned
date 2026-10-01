import { t } from '@toned/systems/base'
import { c, doc } from '@/lib/doc.tsx'
import { Progress } from './progress.tsx'

export default doc({
  description:
    'A progress bar with accessible values, custom ranges and three sizes. Try value 120 with max 200 for a 60% fill.',
  components: [
    c(
      { Progress },
      { value: 60, max: 100, size: 'md', 'aria-label': 'Release progress' },
    ),
  ],
  preview: (C) => (
    <div
      {...t({ flexLayout: 'column', gap: 2, width: '360px', maxWidth: '100%' })}
    >
      <div
        {...t({
          flexLayout: 'row',
          justifyContent: 'space-between',
          typo: 'body_small',
        })}
      >
        <span {...t({ fontWeight: 500 })}>Release progress</span>
        <span {...t({ textColor: 'muted' })}>Uploading assets</span>
      </div>
      <C.Progress />
    </div>
  ),
})
