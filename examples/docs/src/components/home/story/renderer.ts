import 'virtual:toned-home-story.css'
import { createWebRenderer } from '@toned/core/server'
import manifest from 'virtual:toned-home-story.manifest'

import { ui } from './system.ts'

/** The web renderer for the worked example: classes from the built CSS. */
export const storyRenderer = createWebRenderer(ui, { manifest })
