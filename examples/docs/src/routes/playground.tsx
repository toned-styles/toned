import { createFileRoute } from '@tanstack/react-router'
import { useStyles } from '@toned/react'

import { PlaygroundEditor } from '../components/playground-editor/PlaygroundEditor.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { playgroundEditorStyles } from '../styles/playground-editor.ts'

import '../styles/home.css'
import '../components/playground-editor/playground-editor.css'

export const Route = createFileRoute('/playground')({ component: Playground })

function Playground() {
  const s = useStyles(playgroundEditorStyles)
  return (
    <div {...s.Page.withProps({ className: 'tnd-playground' })}>
      <a className="tnd-skip-link" href="#main">
        Skip to the editor
      </a>
      <SiteHeader />
      <PlaygroundEditor />
    </div>
  )
}
