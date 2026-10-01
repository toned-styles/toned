import { useStyles } from '@toned/react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { playgroundStyles } from '../../styles/playground.ts'

/** Shows a component's render error on the stage instead of blanking the page. */
export class PreviewBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Preview error:', error, info)
  }

  render() {
    if (this.state.error)
      return <PreviewError message={this.state.error.message} />
    return this.props.children
  }
}

function PreviewError({ message }: { message: string }) {
  const s = useStyles(playgroundStyles)
  return (
    <div role="alert" {...s.previewError}>
      {message}
    </div>
  )
}
