import { TonedProvider, useStyles } from '@toned/react'
import { webHost } from '@toned/react/hosts/web'
import {
  Component,
  type ComponentProps,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useInsertionEffect,
} from 'react'
import { playgroundEditorStyles } from '../../styles/playground-editor.ts'
import type { Compiled, VariantValue } from './types.ts'

type BoundaryProps = {
  children: ReactNode
  fallback: ReactNode
  /** A change (new build or variant selection) retries the failed render. */
  resetKey: string
  onError: (error: Error) => void
}

class RenderBoundary extends Component<BoundaryProps, { error: Error | null }> {
  override state = { error: null as Error | null }

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  override componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error)
  }

  override componentDidUpdate(previous: BoundaryProps) {
    if (this.state.error && previous.resetKey !== this.props.resetKey)
      this.setState({ error: null })
  }

  override render() {
    return this.state.error ? this.props.fallback : this.props.children
  }
}

/** The build's CSS lives exactly as long as a view that renders it. */
function useBuildCss(result: Compiled) {
  useInsertionEffect(() => {
    const style = document.createElement('style')
    style.dataset.tonedPlayground = result.scope
    style.textContent = result.css
    document.head.appendChild(style)
    return () => style.remove()
  }, [result])
}

/** The build's renderers are typed loosely: their systems exist only at runtime. */
function providerProps(result: Compiled) {
  return {
    renderer: result.renderers,
    host: webHost,
  } as unknown as ComponentProps<typeof TonedProvider>
}

function ResultView({
  result,
  props,
  onCommit,
}: {
  result: Compiled
  props: Record<string, VariantValue>
  onCommit?: (result: Compiled) => void
}) {
  const s = useStyles(playgroundEditorStyles)
  useBuildCss(result)
  // Runs only when the whole subtree committed without throwing.
  useEffect(() => {
    onCommit?.(result)
  })
  const { Component: UserComponent } = result
  const view = <UserComponent {...props} />
  return (
    <div {...s.PreviewRoot} data-toned-preview={result.scope}>
      {result.renderers.length ? (
        <TonedProvider {...providerProps(result)}>{view}</TonedProvider>
      ) : (
        view
      )}
    </div>
  )
}

/**
 * Renders the newest build. If it throws while rendering, the last build that
 * rendered cleanly stays on screen and the error is reported beside it.
 */
export function PreviewStage({
  result,
  stable,
  props,
  selectionKey,
  onRendered,
  onRenderError,
}: {
  result: Compiled
  stable: Compiled | null
  props: Record<string, VariantValue>
  selectionKey: string
  onRendered: (result: Compiled) => void
  onRenderError: (error: Error) => void
}) {
  const s = useStyles(playgroundEditorStyles)
  const fallback =
    stable && stable !== result ? (
      <RenderBoundary
        resetKey={`${stable.id}:${selectionKey}`}
        onError={() => {}}
        fallback={<p {...s.Placeholder}>The preview could not render.</p>}
      >
        <ResultView result={stable} props={props} />
      </RenderBoundary>
    ) : (
      <p {...s.Placeholder}>Fix the error to see the preview.</p>
    )
  return (
    <RenderBoundary
      resetKey={`${result.id}:${selectionKey}`}
      onError={onRenderError}
      fallback={fallback}
    >
      <ResultView result={result} props={props} onCommit={onRendered} />
    </RenderBoundary>
  )
}
