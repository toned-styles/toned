import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui"
import { useStyles } from "@toned/react"
import { stylesheet } from "@toned/systems/base"

import { cn } from "@/lib/utils"

const navMenuStyles = stylesheet({
  root: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    style: {
      maxWidth: 'max-content',
      flex: 1,
    },
  },
  list: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    style: {
      flex: 1,
      listStyle: 'none',
    },
  },
  item: {
    position: 'relative',
  },
  trigger: {
    bgColor: 'default',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'medium',
    typo: 'body_small',
    fontWeight: 500,
    paddingX: 4,
    paddingY: 2,
    height: '2.25rem',
    cursor: 'pointer',
    style: {
      width: 'max-content',
      outline: 'none',
      transition: 'color 0.15s, box-shadow 0.15s',
      border: 'none',
    },
    ':hover': {
      bgColor: 'subtle',
      textColor: 'subtle',
    },
  },
  triggerIcon: {
    position: 'relative',
    style: {
      top: '1px',
      marginLeft: '0.25rem',
      width: '0.75rem',
      height: '0.75rem',
      transition: 'transform 0.3s',
    },
  },
  content: {
    padding: 2,
    style: {
      top: 0,
      left: 0,
      width: '100%',
      paddingRight: '0.625rem',
    },
    '@md': {
      position: 'absolute',
      style: {
        width: 'auto',
      },
    },
  },
  viewportWrapper: {
    position: 'absolute',
    zIndex: 50,
    display: 'flex',
    justifyContent: 'center',
    style: {
      top: '100%',
      left: 0,
      isolation: 'isolate',
    },
  },
  viewport: {
    bgColor: 'elevated',
    textColor: 'default',
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'medium',
    shadow: 'medium',
    position: 'relative',
    overflow: 'hidden',
    style: {
      marginTop: '0.375rem',
      height: 'var(--radix-navigation-menu-viewport-height)',
      width: '100%',
      transformOrigin: 'top center',
    },
    '@md': {
      style: {
        width: 'var(--radix-navigation-menu-viewport-width)',
      },
    },
  },
  link: {
    display: 'flex',
    flexLayout: 'column',
    gap: 1,
    borderRadius: 'small',
    padding: 2,
    typo: 'body_small',
    style: {
      transition: 'all 0.15s',
      outline: 'none',
    },
    ':hover': {
      bgColor: 'subtle',
      textColor: 'subtle',
    },
  },
  indicator: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
    style: {
      top: '100%',
      height: '0.375rem',
    },
  },
  indicatorArrow: {
    bgColor: 'subtle',
    position: 'relative',
    shadow: 'medium',
    borderRadius: 'small',
    style: {
      top: '60%',
      height: '0.5rem',
      width: '0.5rem',
      transform: 'rotate(45deg)',
    },
  },
})

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean
}) {
  const s = useStyles(navMenuStyles)

  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      {...s.root.with({ className: cn("group/navigation-menu", className) })}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  const s = useStyles(navMenuStyles)

  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      {...s.list.with({ className })}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  const s = useStyles(navMenuStyles)

  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      {...s.item.with({ className })}
      {...props}
    />
  )
}

const navigationMenuTriggerStyle = navMenuStyles

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  const s = useStyles(navMenuStyles)

  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      {...s.trigger.with({ className: cn("group", className) })}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        {...s.triggerIcon}
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  const s = useStyles(navMenuStyles)

  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  const s = useStyles(navMenuStyles)

  return (
    <div {...s.viewportWrapper}>
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        {...s.viewport.with({ className })}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  const s = useStyles(navMenuStyles)

  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      {...s.link.with({ className })}
      {...props}
    />
  )
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  const s = useStyles(navMenuStyles)

  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      {...s.indicator.with({ className })}
      {...props}
    >
      <div {...s.indicatorArrow} />
    </NavigationMenuPrimitive.Indicator>
  )
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
