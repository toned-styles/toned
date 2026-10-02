'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { OTPInput, OTPInputContext } from 'input-otp'
import { MinusIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils.ts'

/*
 * Slots share their borders: rounding the first and last slot and overlapping
 * the edges between them depend on position, so those rules are in styles.css.
 */
export const inputOtpStyles = stylesheet({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  group: {
    display: 'flex',
    alignItems: 'center',
  },
  slot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '2.5rem',
    height: '2.5rem',
    bgColor: 'default',
    textColor: 'default',
    borderColor: 'input',
    borderWidth: 'thin',
    typo: 'label_medium',
    shadow: 'small',
    // No token: the transition list is specific to this part.
    '@platform web': {
      $style: { transition: 'border-color 0.15s, box-shadow 0.15s' },
    },
  },
  caret: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    // No token for the inset shorthand.
    '@platform web': { $style: { inset: 0 } },
  },
  caretBar: {
    bgColor: 'emphasized',
    height: '1.125rem',
    width: '1px',
    // No token: the blink keyframes live in styles.css.
    '@platform web': {
      $style: { animation: 'caret-blink 1s steps(1) infinite' },
    },
  },
  separator: {
    display: 'flex',
    alignItems: 'center',
    textColor: 'muted',
  },
}).variants(
  ($: Variants<{ active: boolean }>) => ({
    [$.active(true)]: {
      slot: { borderColor: 'action', shadow: 'focus', zIndex: 1 },
    },
  }),
  { defaults: { active: false } },
)

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  const s = useStyles(inputOtpStyles)

  return (
    <OTPInput
      data-slot="input-otp"
      // The library takes a class name for its container, not a component.
      containerClassName={cn(s.container.className, containerClassName)}
      className={className}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(inputOtpStyles)

  return (
    <div
      data-slot="input-otp-group"
      {...s.group.with({ className })}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}
  const s = useStyles(inputOtpStyles, { active: !!isActive })

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      {...s.slot.with({ className })}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div {...s.caret}>
          <div {...s.caretBar} />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useStyles(inputOtpStyles)

  return (
    <div
      data-slot="input-otp-separator"
      aria-hidden="true"
      {...s.separator.with({ className })}
      {...props}
    >
      <MinusIcon />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
