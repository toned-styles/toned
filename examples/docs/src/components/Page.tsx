import type React from 'react'
import { ApiDefineSystem } from '../pages/api/DefineSystem.tsx'
import { ApiMediaQueries } from '../pages/api/MediaQueries.tsx'
import { ApiStylesheet } from '../pages/api/Stylesheet.tsx'
import { ApiUseStyles } from '../pages/api/UseStyles.tsx'
import { ApiVariants } from '../pages/api/Variants.tsx'
import { Concepts } from '../pages/Concepts.tsx'
import { GettingStarted } from '../pages/GettingStarted.tsx'
import { GuideInteractive } from '../pages/guides/Interactive.tsx'
import { GuideReactNative } from '../pages/guides/ReactNative.tsx'
import { GuideReactWeb } from '../pages/guides/ReactWeb.tsx'
import { GuideTheming } from '../pages/guides/Theming.tsx'

const PAGES: Record<string, () => React.ReactElement> = {
  'getting-started': GettingStarted,
  concepts: Concepts,
  'api-define-system': ApiDefineSystem,
  'api-stylesheet': ApiStylesheet,
  'api-variants': ApiVariants,
  'api-use-styles': ApiUseStyles,
  'api-media-queries': ApiMediaQueries,
  'guide-react-web': GuideReactWeb,
  'guide-react-native': GuideReactNative,
  'guide-theming': GuideTheming,
  'guide-interactive': GuideInteractive,
}

export function Page({ page }: { page: string }) {
  const Component = PAGES[page] ?? GettingStarted
  return <Component />
}
