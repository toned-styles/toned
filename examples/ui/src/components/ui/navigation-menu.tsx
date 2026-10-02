import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { ChevronDownIcon } from 'lucide-react'
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui'
import type * as React from 'react'

/*
 * The open trigger, its rotated chevron and the viewport animation are keyed
 * on Radix data attributes in styles.css.
 */
export const navMenuStyles = stylesheet({
  root: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 'max-content',
  },
  list: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  item: {
    position: 'relative',
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    width: 'max-content',
    height: '2.25rem',
    paddingX: 3,
    borderRadius: 'medium',
    typo: 'label_small',
    textColor: 'default',
    cursor: 'pointer',
    // No token: the transition list is specific to this part.
    '@platform web': {
      $style: { transition: 'background-color 0.15s, box-shadow 0.15s' },
    },
    ':hover': { bgColor: 'subtle' },
    ':focus-visible': { shadow: 'focus' },
  },
  triggerIcon: {
    width: '0.75rem',
    height: '0.75rem',
    textColor: 'muted',
    // The open state rotates the icon from styles.css.
    '@platform web': { $style: { transition: 'transform 0.2s' } },
  },
  content: {
    top: 0,
    left: 0,
    width: '100%',
    padding: 2,
    '@media md': { position: 'absolute', width: 'auto' },
  },
  viewportWrapper: {
    position: 'absolute',
    zIndex: 50,
    display: 'flex',
    justifyContent: 'center',
    top: '100%',
    left: 0,
  },
  viewport: {
    bgColor: 'elevated',
    textColor: 'default',
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'large',
    shadow: 'large',
    position: 'relative',
    overflow: 'hidden',
    marginTop: 1.5,
    height: 'var(--radix-navigation-menu-viewport-height)',
    width: '100%',
    // No tokens: the panel grows from the bar and resizes between menus.
    '@platform web': {
      $style: {
        transformOrigin: 'top center',
        transition: 'width 0.2s, height 0.2s',
      },
    },
    '@media md': { width: 'var(--radix-navigation-menu-viewport-width)' },
  },
  link: {
    flexLayout: 'column',
    gap: 0.5,
    padding: 2,
    borderRadius: 'medium',
    typo: 'body_small',
    textColor: 'default',
    // No token: the transition list is specific to this part.
    '@platform web': {
      $style: { transition: 'background-color 0.15s, box-shadow 0.15s' },
    },
    ':hover': { bgColor: 'subtle' },
    ':focus-visible': { shadow: 'focus' },
  },
  indicator: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
    top: '100%',
    height: '0.375rem',
  },
  indicatorArrow: {
    bgColor: 'elevated',
    borderColor: 'default',
    borderWidth: 'thin',
    position: 'relative',
    top: '60%',
    height: '0.5rem',
    width: '0.5rem',
    // No token for transforms: a rotated square reads as an arrow.
    '@platform web': { $style: { transform: 'rotate(45deg)' } },
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
      {...s.root.with({ className })}
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
      {...s.trigger.with({ className })}
      {...props}
    >
      {children}
      <ChevronDownIcon {...s.triggerIcon} aria-hidden="true" />
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
    <div data-slot="navigation-menu-viewport-wrapper" {...s.viewportWrapper}>
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
      <div data-slot="navigation-menu-indicator-arrow" {...s.indicatorArrow} />
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
