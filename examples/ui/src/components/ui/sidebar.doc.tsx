import { t } from '@toned/systems/base'
import {
  BoxIcon,
  HomeIcon,
  RocketIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react'

import { c, doc } from '@/lib/doc.tsx'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './sidebar.tsx'

const pages = [
  ['Overview', HomeIcon],
  ['Releases', RocketIcon],
  ['Team', UsersIcon],
  ['Settings', SettingsIcon],
] as const

export default doc({
  description:
    'An application sidebar that collapses to icons or slides off screen, and becomes a sheet on small screens. Press the button in the header, or ⌘B, to toggle it.',
  components: [
    c({ SidebarProvider }, { defaultOpen: true }),
    c({ Sidebar }, { collapsible: 'icon', side: 'left', variant: 'sidebar' }),
    c({ SidebarMenuButton }, { size: 'default', variant: 'default' }),
  ],
  preview: (C) => (
    <C.SidebarProvider
      {...t({
        position: 'relative',
        maxWidth: '600px',
        height: '20rem',
        overflow: 'hidden',
        borderColor: 'default',
        borderWidth: 'thin',
        borderRadius: 'large',
        // The sidebar is fixed to the viewport. A transform makes this frame
        // its containing block, so the demo stays inside the preview.
        $style: { minHeight: 0, transform: 'translateZ(0)' },
      })}
    >
      <C.Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <BoxIcon />
                <span>Orbit workspace</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Project</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pages.map(([label, Icon], index) => (
                  <SidebarMenuItem key={label}>
                    <C.SidebarMenuButton isActive={index === 1} tooltip={label}>
                      <Icon />
                      <span>{label}</span>
                    </C.SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </C.Sidebar>
      <SidebarInset>
        <div
          {...t({
            flexLayout: 'row',
            alignItems: 'center',
            gap: 2,
            padding: 3,
            typo: 'label_small',
          })}
        >
          <SidebarTrigger />
          Releases
        </div>
        <p {...t({ paddingX: 4, typo: 'body_small', textColor: 'muted' })}>
          The sidebar pushes this content aside when it is open.
        </p>
      </SidebarInset>
    </C.SidebarProvider>
  ),
})
