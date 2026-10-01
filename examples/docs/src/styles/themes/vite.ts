import { buildStyles } from '@toned/core/build'
import type { Plugin } from 'vite'
import { themeSheets } from './index.ts'
import { themeSystem } from './system.ts'

const CSS_ID = 'virtual:toned-themes.css'
const MANIFEST_ID = 'virtual:toned-themes.manifest'

/**
 * Builds the theme showcase's CSS. `@toned/core/vite` serves one system per
 * build and the site already uses it, so this second system is built here
 * with the same `buildStyles` call and served beside it. The stylesheet is
 * the system's classes followed by its themes: one block of custom
 * properties per theme.
 */
export function themeShowcase(): Plugin {
  let artifact: ReturnType<typeof buildStyles> | undefined
  const build = () => {
    artifact ??= buildStyles(themeSystem, { sheets: themeSheets })
    return artifact
  }
  return {
    name: 'toned-theme-showcase',
    buildStart() {
      artifact = undefined
    },
    resolveId(id) {
      if (id === CSS_ID || id === MANIFEST_ID) return `\0${id}`
    },
    load(id) {
      if (id === `\0${CSS_ID}`) return build().css
      if (id === `\0${MANIFEST_ID}`)
        return `export default ${JSON.stringify(build().manifest)}`
    },
  }
}
