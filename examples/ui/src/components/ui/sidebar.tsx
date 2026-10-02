import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import { PanelLeftIcon } from 'lucide-react'
import { Slot } from 'radix-ui'
import * as React from 'react'

import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { useIsMobile } from '@/hooks/use-mobile.ts'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = '16rem'
const SIDEBAR_WIDTH_MOBILE = '18rem'
const SIDEBAR_WIDTH_ICON = '3rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

/*
 * The sidebar has its own surface colours (`--sidebar`, `--sidebar-accent`,
 * ...), which the base system has no tokens for, so they are written as
 * variables in `$style`. Collapsed and off-canvas states are keyed on data
 * attributes in styles.css.
 */
export const sidebarStyles = stylesheet({
  wrapper: {
    display: 'flex',
    minHeight: '100svh',
    width: '100%',
  },
  sidebarNone: {
    display: 'flex',
    flexLayout: 'column',
    height: '100%',
    '@platform web': {
      $style: {
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar)',
        color: 'var(--sidebar-foreground)',
      },
    },
  },
  mobileSidebarContent: {
    '@platform web': {
      $style: {
        width: 'var(--sidebar-width)',
        padding: 0,
        background: 'var(--sidebar)',
        color: 'var(--sidebar-foreground)',
      },
    },
  },
  mobileSidebarInner: {
    display: 'flex',
    flexLayout: 'column',
    height: '100%',
    width: '100%',
  },
  sidebarOuter: {
    '@platform web': {
      $style: {
        color: 'var(--sidebar-foreground)',
      },
    },
  },
  sidebarGap: {
    position: 'relative',
    '@platform web': {
      $style: {
        width: 'var(--sidebar-width)',
        background: 'transparent',
        transition: 'width 200ms linear',
      },
    },
  },
  sidebarContainer: {
    position: 'fixed',
    zIndex: 10,
    display: 'none',
    top: 0,
    bottom: 0,
    '@platform web': {
      $style: {
        width: 'var(--sidebar-width)',
        transition: 'left 200ms linear, right 200ms linear, width 200ms linear',
      },
    },
  },
  sidebarInner: {
    display: 'flex',
    flexLayout: 'column',
    height: '100%',
    width: '100%',
    '@platform web': {
      $style: {
        background: 'var(--sidebar)',
      },
    },
  },
  trigger: {
    width: '1.75rem',
    height: '1.75rem',
  },
  rail: {
    position: 'absolute',
    zIndex: 20,
    display: 'none',
    width: '1rem',
    top: 0,
    bottom: 0,
    '@platform web': {
      $style: {
        inset: '0',
        transform: 'translateX(-50%)',
        transition: 'all 150ms linear',
      },
    },
  },
  inset: {
    position: 'relative',
    display: 'flex',
    width: '100%',
    '@platform web': {
      $style: {
        flex: '1',
        flexDirection: 'column',
        background: 'var(--background)',
      },
    },
  },
  input: {
    height: '2rem',
    width: '100%',
    '@platform web': {
      $style: {
        background: 'var(--background)',
        boxShadow: 'none',
      },
    },
  },
  header: {
    display: 'flex',
    flexLayout: 'column',
    gap: 2,
    padding: 2,
  },
  footer: {
    display: 'flex',
    flexLayout: 'column',
    gap: 2,
    padding: 2,
  },
  separator: {
    marginX: 2,
    $style: {
      width: 'auto',
      borderColor: 'var(--sidebar-border)',
    },
  },
  content: {
    display: 'flex',
    flexLayout: 'column',
    gap: 2,
    minHeight: 0,
    overflowY: 'auto',
    '@platform web': {
      $style: {
        flex: '1',
      },
    },
  },
  group: {
    position: 'relative',
    display: 'flex',
    flexLayout: 'column',
    padding: 2,
    width: '100%',
    minWidth: 0,
  },
  groupLabel: {
    borderRadius: 'medium',
    display: 'flex',
    alignItems: 'center',
    height: '2rem',
    flexShrink: '0',
    fontSize: '0.75rem',
    fontWeight: 500,
    paddingLeft: 2,
    paddingRight: 2,
    '@platform web': {
      $style: {
        color: 'color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)',
        transition: 'margin 200ms linear, opacity 200ms linear',
      },
    },
  },
  groupAction: {
    borderRadius: 'medium',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    width: '1.25rem',
    top: '0.875rem',
    right: '0.75rem',
    ':hover': {
      bgColor: 'subtle',
      textColor: 'subtle',
    },
    '@platform web': {
      $style: {
        aspectRatio: '1',
        padding: 0,
        color: 'var(--sidebar-foreground)',
        transition: 'transform 150ms',
      },
    },
  },
  groupContent: {
    width: '100%',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  menu: {
    display: 'flex',
    flexLayout: 'column',
    width: '100%',
    minWidth: 0,
    gap: 1,
    '@platform web': {
      $style: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
      },
    },
  },
  menuItem: {
    position: 'relative',
    '@platform web': {
      $style: {
        listStyle: 'none',
      },
    },
  },
  menuButton: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: 2,
    padding: 2,
    overflow: 'hidden',
    borderRadius: 'medium',
    typo: 'body_small',
    cursor: 'pointer',
    '@platform web': {
      $style: {
        textAlign: 'left',
        color: 'var(--sidebar-foreground)',
        transition:
          'background-color 150ms, width 200ms, height 200ms, padding 200ms',
      },
    },
    ':hover': { $style: { backgroundColor: 'var(--sidebar-accent)' } },
  },
  menuAction: {
    borderRadius: 'medium',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    width: '1.25rem',
    top: '0.375rem',
    right: '0.25rem',
    ':hover': {
      bgColor: 'subtle',
      textColor: 'subtle',
    },
    '@platform web': {
      $style: {
        aspectRatio: '1',
        padding: 0,
        color: 'var(--sidebar-foreground)',
        transition: 'transform 150ms',
      },
    },
  },
  menuBadge: {
    borderRadius: 'medium',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '1.25rem',
    minWidth: '1.25rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    pointerEvents: 'none',
    right: '0.25rem',
    paddingLeft: 1,
    paddingRight: 1,
    '@platform web': {
      $style: {
        fontVariantNumeric: 'tabular-nums',
        userSelect: 'none',
        color: 'var(--sidebar-foreground)',
      },
    },
  },
  menuSkeleton: {
    borderRadius: 'medium',
    display: 'flex',
    alignItems: 'center',
    height: '2rem',
    gap: 2,
    paddingLeft: 2,
    paddingRight: 2,
    $style: {},
  },
  menuSub: {
    display: 'flex',
    flexLayout: 'column',
    minWidth: 0,
    gap: 1,
    paddingY: 0.5,
    paddingX: 2.5,
    marginY: 0,
    marginX: 3.5,
    '@platform web': {
      $style: {
        transform: 'translateX(1px)',
        borderLeft: '1px solid var(--sidebar-border)',
        listStyle: 'none',
      },
    },
  },
  menuSubItem: {
    position: 'relative',
    '@platform web': {
      $style: {
        listStyle: 'none',
      },
    },
  },
  menuSubButton: {
    display: 'flex',
    alignItems: 'center',
    height: '1.75rem',
    minWidth: 0,
    gap: 2,
    overflow: 'hidden',
    paddingX: 2,
    borderRadius: 'medium',
    typo: 'body_small',
    '@platform web': {
      $style: {
        transform: 'translateX(-1px)',
        color: 'var(--sidebar-foreground)',
        transition: 'background-color 150ms',
      },
    },
    ':hover': { $style: { backgroundColor: 'var(--sidebar-accent)' } },
  },
}).variants(
  (
    $: Variants<{
      size: 'default' | 'sm' | 'lg'
      variant: 'default' | 'outline'
      active: boolean
    }>,
  ) => ({
    [$.size('sm')]: { menuButton: { height: '1.75rem', typo: 'caption' } },
    [$.size('default')]: { menuButton: { height: '2rem' } },
    [$.size('lg')]: { menuButton: { height: '3rem' } },
    [$.variant('outline')]: {
      menuButton: {
        '@platform web': {
          $style: {
            backgroundColor: 'var(--background)',
            boxShadow: '0 0 0 1px var(--sidebar-border)',
          },
        },
      },
    },
    [$.active(true)]: {
      menuButton: {
        fontWeight: 500,
        '@platform web': {
          $style: {
            backgroundColor: 'var(--sidebar-accent)',
            color: 'var(--sidebar-accent-foreground)',
          },
        },
      },
      menuSubButton: {
        '@platform web': {
          $style: {
            backgroundColor: 'var(--sidebar-accent)',
            color: 'var(--sidebar-accent-foreground)',
          },
        },
      },
    },
  }),
  { defaults: { size: 'default', variant: 'default', active: false } },
)

type SidebarContextProps = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.')
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const s = useStyles(sidebarStyles)

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  // We add a state so that we can do data-state="expanded" or "collapsed".
  const state = open ? 'expanded' : 'collapsed'

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          {...s.wrapper.with({
            className,
            $style: {
              '--sidebar-width': SIDEBAR_WIDTH,
              '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties,
          })}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  collapsible?: 'offcanvas' | 'icon' | 'none'
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
  const s = useStyles(sidebarStyles)

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        {...s.sidebarNone.with({ className })}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          {...s.mobileSidebarContent.with({
            $style: {
              '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties,
          })}
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div {...s.mobileSidebarInner}>{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      {...s.sidebarOuter}
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div data-slot="sidebar-gap" {...s.sidebarGap} />
      <div
        data-slot="sidebar-container"
        {...s.sidebarContainer.with({
          className,
          $style: {
            ...(side === 'left' ? { left: 0 } : { right: 0 }),
            ...(variant === 'floating' || variant === 'inset'
              ? { padding: '0.5rem' }
              : {}),
          },
        })}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          {...s.sidebarInner.with({
            style:
              variant === 'floating'
                ? {
                    borderRadius: 'calc(var(--radius) + 2px)',
                    border: '1px solid var(--sidebar-border)',
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                  }
                : {},
          })}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()
  const s = useStyles(sidebarStyles)

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      aria-label="Toggle sidebar"
      variant="ghost"
      size="icon"
      {...s.trigger.with({ className })}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
    </Button>
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar()
  const s = useStyles(sidebarStyles)

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      {...s.rail.with({ className })}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  const s = useStyles(sidebarStyles)

  return (
    <main
      data-slot="sidebar-inset"
      {...s.inset.with({ className })}
      {...props}
    />
  )
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const s = useStyles(sidebarStyles)

  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      {...s.input.with({ className })}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(sidebarStyles)

  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      {...s.header.with({ className })}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(sidebarStyles)

  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      {...s.footer.with({ className })}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  const s = useStyles(sidebarStyles)

  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      {...s.separator.with({ className })}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(sidebarStyles)

  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      {...s.content.with({ className })}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  const s = useStyles(sidebarStyles)

  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      {...s.group.with({ className })}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  const s = useStyles(sidebarStyles)

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      {...s.groupLabel.with({ className })}
      {...props}
    />
  )
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  const s = useStyles(sidebarStyles)

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      {...s.groupAction.with({ className })}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useStyles(sidebarStyles)

  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      {...s.groupContent.with({ className })}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  const s = useStyles(sidebarStyles)

  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      {...s.menu.with({ className })}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  const s = useStyles(sidebarStyles)

  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      {...s.menuItem.with({ className })}
      {...props}
    />
  )
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}) {
  const Comp = asChild ? Slot.Root : 'button'
  const { isMobile, state } = useSidebar()
  const s = useStyles(sidebarStyles, { size, variant, active: isActive })

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-variant={variant}
      data-active={isActive}
      {...s.menuButton.with({ className })}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === 'string') {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean
  showOnHover?: boolean
}) {
  const Comp = asChild ? Slot.Root : 'button'
  const s = useStyles(sidebarStyles)

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      data-show-on-hover={showOnHover || undefined}
      {...s.menuAction.with({ className })}
      {...props}
    />
  )
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const s = useStyles(sidebarStyles)

  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      {...s.menuBadge.with({ className })}
      {...props}
    />
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & {
  showIcon?: boolean
}) {
  // A width between 50 and 90%, varied per instance but stable across server
  // and client renders.
  const id = React.useId()
  const width = React.useMemo(() => {
    let hash = 0
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    return `${(hash % 40) + 50}%`
  }, [id])

  const s = useStyles(sidebarStyles)

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      {...s.menuSkeleton.with({ className })}
      {...props}
    >
      {showIcon && (
        <Skeleton
          data-sidebar="menu-skeleton-icon"
          style={{
            width: '1rem',
            height: '1rem',
          }}
        />
      )}
      <Skeleton
        data-sidebar="menu-skeleton-text"
        style={
          {
            height: '1rem',
            maxWidth: 'var(--skeleton-width)',
            flex: 1,
            '--skeleton-width': width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  const s = useStyles(sidebarStyles)

  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      {...s.menuSub.with({ className })}
      {...props}
    />
  )
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<'li'>) {
  const s = useStyles(sidebarStyles)

  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      {...s.menuSubItem.with({ className })}
      {...props}
    />
  )
}

function SidebarMenuSubButton({
  asChild = false,
  size = 'md',
  isActive = false,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean
  size?: 'sm' | 'md'
  isActive?: boolean
}) {
  const Comp = asChild ? Slot.Root : 'a'
  const s = useStyles(sidebarStyles, { active: isActive })

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      {...s.menuSubButton.with({ className })}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
