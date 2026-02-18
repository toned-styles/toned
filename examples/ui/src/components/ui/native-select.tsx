import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const nativeSelectStyles = stylesheet({
  wrapper: {
    position: 'relative',
    style: {
      width: 'fit-content',
    },
  },
  select: {
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'medium',
    typo: 'body_small',
    shadow: 'small',
    height: '2.25rem',
    width: '100%',
    minWidth: '0',
    style: {
      appearance: 'none',
      background: 'transparent',
      paddingLeft: '0.75rem',
      paddingRight: '2.25rem',
      paddingTop: '0.5rem',
      paddingBottom: '0.5rem',
      outline: 'none',
      transition: 'color 0.15s, box-shadow 0.15s',
    },
  },
  selectSm: {
    height: '2rem',
    style: {
      paddingTop: '0.25rem',
      paddingBottom: '0.25rem',
    },
  },
  icon: {
    textColor: 'muted',
    position: 'absolute',
    pointerEvents: 'none',
    opacity: 0.5,
    width: '1rem',
    height: '1rem',
    style: {
      top: '50%',
      right: '0.875rem',
      transform: 'translateY(-50%)',
      userSelect: 'none',
    },
  },
})

function NativeSelect({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  const s = useStyles(nativeSelectStyles)

  return (
    <div
      {...s.wrapper}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(s.select.className, size === 'sm' && s.selectSm.className, className)}
        style={{
          ...s.select.style,
          ...(size === 'sm' ? s.selectSm.style : undefined),
        }}
        {...props}
      />
      <ChevronDownIcon
        {...s.icon}
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn(className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
