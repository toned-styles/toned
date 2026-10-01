import { useStyles } from '@toned/react'
import type { ButtonHTMLAttributes } from 'react'
import { choiceStyles } from '../styles/home.ts'

export function ChoiceButton({
  selected,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  const s = useStyles(choiceStyles, { selected })
  return (
    <button
      {...s.Button.withProps<'button'>({
        ...props,
        type: 'button',
        'aria-pressed': selected,
      })}
    />
  )
}
