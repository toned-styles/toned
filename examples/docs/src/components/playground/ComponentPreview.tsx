import { useStyles } from '@toned/react'
import { playgroundStyles } from '../../styles/playground.ts'
import { PreviewBoundary } from './PreviewBoundary.tsx'

interface ComponentPreviewProps {
  component: React.ComponentType<Record<string, unknown>> | null
  props: Record<string, unknown>
}

export function ComponentPreview({
  component: Comp,
  props,
}: ComponentPreviewProps) {
  const s = useStyles(playgroundStyles)

  if (!Comp) {
    return (
      <div {...s.preview} data-preview-stage>
        <span {...s.readOnly}>No component to preview</span>
      </div>
    )
  }

  // Separate children from other props
  const { children, ...restProps } = props

  // Filter out empty/undefined values
  const cleanProps: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(restProps)) {
    if (value !== undefined && value !== '') {
      cleanProps[key] = value
    }
  }

  return (
    <div {...s.preview} data-preview-stage>
      <PreviewBoundary>
        <Comp {...cleanProps}>
          {children != null && children !== '' ? String(children) : undefined}
        </Comp>
      </PreviewBoundary>
    </div>
  )
}
