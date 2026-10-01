import 'virtual:toned-themes.css'
import manifest from 'virtual:toned-themes.manifest'
import { createWebRenderer } from '@toned/core/server'
import { TonedProvider } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import type { ReactNode } from 'react'
import { themeSystem } from '../../styles/themes/system.ts'

const renderer = createWebRenderer(themeSystem, { manifest })

/**
 * Registers the showcase's system beside the site's own. The renderer keeps
 * its default tokens, which are references to custom properties, so the
 * active theme is whichever `data-theme` scope an element sits in.
 */
export function ThemeScope({ children }: { children: ReactNode }) {
  return (
    <TonedProvider renderer={renderer} host={webHost}>
      {children}
    </TonedProvider>
  )
}
