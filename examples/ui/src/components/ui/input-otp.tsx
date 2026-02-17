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
  caret: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    style: {
      inset: '0',
      pointerEvents: 'none',
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
      className={cn(s.group.className, className)}
      style={s.group.style}
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
      className={cn(s.slot.className, className)}
      style={s.slot.style}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className={s.caret.className} style={s.caret.style}>
          <div className={s.caretBar.className} style={s.caretBar.style} />
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
