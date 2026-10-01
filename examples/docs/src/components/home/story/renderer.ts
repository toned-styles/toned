import 'virtual:toned-home-story.css'
import manifest from 'virtual:toned-home-story.manifest'
import { createWebRenderer } from '@toned/core/server'
import { ui } from './system.ts'

/** The web renderer for the worked example: classes from the built CSS. */
export const storyRenderer = createWebRenderer(ui, { manifest })
