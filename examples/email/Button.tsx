import { Button as EmailButton } from 'react-email'

import { props } from './styles.ts'

export function Button({ label }: { label: string }) {
  return (
    <EmailButton href="https://example.com/account" {...props.Action}>
      {label}
    </EmailButton>
  )
}
