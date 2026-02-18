import { useStyles } from '@toned/react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { playgroundStyles } from '../../styles/playground.ts'

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
      <div {...s.preview}>
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
    <div {...s.preview}>
      <ErrorBoundary>
        <Comp {...cleanProps}>
          {children != null && children !== '' ? String(children) : undefined}
        </Comp>
      </ErrorBoundary>
    </div>
  )
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ComponentPreview error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: '#fef2f2',
            color: '#dc2626',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        >
          {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}
