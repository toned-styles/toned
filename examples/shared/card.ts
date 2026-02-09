import { stylesheet } from '@toned/systems/base'

export const styles = stylesheet({
  container: {
    textColor: 'on_action',
    bgColor: 'default',
    alignItems: 'flex-start',
    flexLayout: 'column',
  },
  code: { textColor: 'destructive' },
  'code:hover': {
    code: {
      textColor: 'default',
    },
  },
})
