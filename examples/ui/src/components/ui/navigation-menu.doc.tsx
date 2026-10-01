import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './navigation-menu.tsx'

const guides = [
  ['Getting started', 'Install Toned and style a first component.'],
  ['Tokens', 'Name the design values a system allows.'],
  ['Variants', 'Select appearance and size with props.'],
]

export default doc({
  description:
    'Site navigation where a top-level item can open a panel of links. The panel stays open while the pointer moves into it.',
  components: [
    c({ NavigationMenu }, { 'aria-label': 'Documentation' }),
    c({ NavigationMenuList }, {}),
    c({ NavigationMenuItem }, {}),
    c({ NavigationMenuTrigger }, { children: 'Guides' }),
    c({ NavigationMenuContent }, {}),
    c({ NavigationMenuLink }, { href: '#' }),
  ],
  preview: (C) => (
    // The panel opens below the bar, so the stage leaves room for it.
    <div
      {...t({
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        width: '100%',
        minHeight: '15rem',
      })}
    >
      <C.NavigationMenu>
        <C.NavigationMenuList>
          <C.NavigationMenuItem>
            <C.NavigationMenuTrigger />
            <C.NavigationMenuContent>
              <div {...t({ flexLayout: 'column', gap: 1, width: '17rem' })}>
                {guides.map(([title, body]) => (
                  <C.NavigationMenuLink key={title}>
                    <span {...t({ fontWeight: 500 })}>{title}</span>
                    <span {...t({ textColor: 'muted' })}>{body}</span>
                  </C.NavigationMenuLink>
                ))}
              </div>
            </C.NavigationMenuContent>
          </C.NavigationMenuItem>
          <C.NavigationMenuItem>
            <C.NavigationMenuLink>Components</C.NavigationMenuLink>
          </C.NavigationMenuItem>
          <C.NavigationMenuItem>
            <C.NavigationMenuLink>Changelog</C.NavigationMenuLink>
          </C.NavigationMenuItem>
        </C.NavigationMenuList>
      </C.NavigationMenu>
    </div>
  ),
})
