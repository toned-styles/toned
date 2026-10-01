import { buildStyles } from '@toned/core/build'
import type { Plugin } from 'vite'

import { noticeStyles } from './styles.ts'
import { ui } from './system.ts'

const CSS_ID = 'virtual:toned-home-story.css'
const MANIFEST_ID = 'virtual:toned-home-story.manifest'

/**
 * Builds the CSS for the homepage's worked example. The example has its own
 * small system so that the three files shown on the page are complete, and
 * `@toned/core/vite` serves one system per build (the site's).
 */
export function homeStory(): Plugin {
  let artifact: ReturnType<typeof buildStyles> | undefined
  const build = () => {
    artifact ??= buildStyles(ui, { sheets: [noticeStyles] })
    return artifact
  }
  return {
    name: 'toned-home-story',
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
