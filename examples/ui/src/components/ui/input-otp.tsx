"use client"

import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { MinusIcon } from "lucide-react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const inputOtpStyles = stylesheet({
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
    borderColor: 'default',
    typo: 'body_small',
    shadow: 'small',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    style: {
      height: '2.25rem',
      width: '2.25rem',
      borderWidth: '1px 1px 1px 0',
      borderStyle: 'solid',
      textAlign: 'center',
      outline: 'none',
      transition: 'all 0.15s',
    },
  },
  activeSlot: {
    borderColor: 'interactive',
    zIndex: 10,
    style: {
      boxShadow: '0 0 0 2px color-mix(in srgb, var(--ring) 30%, transparent)',
    },
  },
  caret: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    style: {
      inset: '0',
      animation: 'caret-blink 1.25s ease-out infinite',
    },
  },
  caretBar: {
    bgColor: 'default',
    style: {
      height: '1rem',
      width: '1px',
      animation: 'caret-blink 1s steps(1) infinite',
    },
  },
})

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
      containerClassName={cn(s.container.className, containerClassName)}
      className={cn(className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
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
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}
  const s = useStyles(inputOtpStyles)

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      {...s.slot.with(isActive && s.activeSlot).with({ className })}
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

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
