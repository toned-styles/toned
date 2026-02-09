import { stylesheet } from '@toned/systems/base'

export const styles = stylesheet({
  container: {
    $$type: 'view',

    borderRadius: 'medium',
    borderWidth: 'none',

    style: {
      cursor: 'pointer',
    },
  },

  label: {
    $$type: 'text',
  },
}).variants<{
  size: 'm' | 's'
  variant: 'accent' | 'danger'
  alignment?: 'icon-only' | 'icon-left' | 'icon-right'
}>(($) => ({
  [$.variant('accent')]: {
    container: {
      bgColor: 'action',
    },
    label: {
      textColor: 'on_action',
    },

    'container:hover': {
      container: {
        bgColor: 'action_secondary',
      },
      label: {
        textColor: 'on_action_secondary',
      },
    },
  },

  [$.size('m')]: {
    container: {
      paddingX: 3,
    },
  },

  [$.size('m').alignment('icon-only')]: {
    container: {
      paddingX: 2,
      paddingY: 2,
    },
  },

  [$.size('s')]: {
    container: {
      paddingX: 2,
      paddingY: 1,
    },
  },

  [$.size('s').alignment('icon-only')]: {
    container: {
      paddingX: 1,
      paddingY: 2,
    },
  },
}))
