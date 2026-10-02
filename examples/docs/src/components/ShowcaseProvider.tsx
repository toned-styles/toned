import { createWebRenderer } from '@toned/core/server'
import { TonedProvider } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import type { ReactNode } from 'react'
import manifest from 'virtual:toned.manifest'

import { docsSystem } from '../styles/system.ts'

const renderer = createWebRenderer(docsSystem, { manifest })

export function ShowcaseProvider({ children }: { children: ReactNode }) {
  return (
    <TonedProvider renderer={renderer} host={webHost}>
      {children}
    </TonedProvider>
  )
}
