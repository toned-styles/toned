import { t } from '@toned/systems/base'
import { toast } from 'sonner'
import { c, doc } from '@/lib/doc.tsx'
import { Button } from './button.tsx'
import { Toaster } from './sonner.tsx'

export default doc({
  description:
    'Brief messages that appear in a corner of the screen and dismiss themselves. Render one Toaster, then call toast() from anywhere.',
  components: [
    c(
      { Toaster },
      { position: 'bottom-right', theme: 'light', richColors: false },
    ),
  ],
  preview: (C) => (
    <div
      {...t({
        flexLayout: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 2,
      })}
    >
      <Button
        variant="outline"
        onClick={() =>
          toast('Release published', {
            description: 'Version 2.4.0 is now available.',
          })
        }
      >
        Show a message
      </Button>
      <Button variant="outline" onClick={() => toast.success('Changes saved')}>
        Show a success
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error('The upload failed. Try again.')}
      >
        Show an error
      </Button>
      <C.Toaster />
    </div>
  ),
})
