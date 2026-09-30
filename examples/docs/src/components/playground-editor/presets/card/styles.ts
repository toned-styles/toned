import type { Variants } from '@toned/core'
import { stylesheet } from '@toned/systems/base'

export type CardVariants = {
  elevation: 'flat' | 'raised'
  density: 'comfortable' | 'compact'
}

// One stylesheet, four named parts. Variants restyle any part together.
export const cardStyles = stylesheet({
  Root: {
    display: 'flex',
    flexLayout: 'column',
    width: '100%',
    maxWidth: '360px',
    borderRadius: 'xlarge',
    borderWidth: 'thin',
    borderColor: 'default',
    bgColor: 'default',
    overflow: 'hidden',
  },
  Header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    paddingX: 5,
    paddingTop: 5,
  },
  Title: { $kind: 'text', typography: 'heading-4', textColor: 'default' },
  Status: {
    $kind: 'text',
    paddingX: 2,
    borderRadius: 'full',
    bgColor: 'status_success',
    textColor: 'on_status_success',
    typography: 'label-small',
  },
  Body: {
    $kind: 'text',
    paddingX: 5,
    paddingY: 3,
    typography: 'body-medium',
    textColor: 'subtle',
  },
  Footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 2,
    paddingX: 5,
    paddingY: 4,
    bgColor: 'subtle',
  },
  Action: {
    $kind: 'pressable',
    paddingX: 3,
    paddingY: 1,
    borderRadius: 'medium',
    bgColor: 'action',
    textColor: 'on_action',
    typography: 'label-medium',
    cursor: 'pointer',
  },
}).variants(
  ($: Variants<CardVariants>) => ({
    [$.elevation('raised')]: {
      Root: { shadow: 'large', borderWidth: 'none' },
    },
    [$.density('compact')]: {
      Header: { paddingX: 4, paddingTop: 3 },
      Body: { paddingX: 4, paddingY: 2, typography: 'body-small' },
      Footer: { paddingX: 4, paddingY: 2 },
    },
  }),
  { defaults: { elevation: 'flat', density: 'comfortable' } },
)
