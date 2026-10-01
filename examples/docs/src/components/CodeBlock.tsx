import { useStyles } from '@toned/react'
import { Fragment, useMemo, useState } from 'react'
import { highlight, languageLabel, resolveLanguage } from '../highlight.ts'
import { proseStyles } from '../styles/prose.ts'
import { codeStyles } from '../styles/site.ts'

/**
 * Highlighted, framed code. Highlighting is synchronous, so server and client
 * render identical coloured markup. `lang` accepts Markdown fence labels
 * (`ts`, `sh`, `json`…); without one the language is inferred.
 */
export function CodeBlock({
  children,
  lang,
  title,
  bare,
  maxHeight,
}: {
  children: string
  lang?: string
  /** Replaces the language label, e.g. a file name. */
  title?: string
  /** Drops the outer frame for code already inside a panel. */
  bare?: boolean
  /** Scroll long sources inside the block instead of growing the page. */
  maxHeight?: number
}) {
  const s = useStyles(codeStyles, { bare })
  const code = children.replace(/^\n+|\s+$/g, '')
  const language = resolveLanguage(code, lang)
  const result = useMemo(() => {
    try {
      return highlight(code, language)
    } catch {
      return null // Plain code stays readable if a grammar fails.
    }
  }, [code, language])
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied('done')
    } catch {
      setCopied('failed')
    }
    setTimeout(() => setCopied('idle'), 1600)
  }

  let offset = 0
  return (
    <figure {...s.Frame}>
      <figcaption {...s.Header}>
        <span>{title ?? languageLabel[language]}</span>
        <button type="button" {...s.Copy} onClick={copy} aria-live="polite">
          {copied === 'done'
            ? 'Copied'
            : copied === 'failed'
              ? 'Select to copy'
              : 'Copy'}
        </button>
      </figcaption>
      <pre
        {...s.Pre.with(
          maxHeight ? { style: { maxHeight, overflowY: 'auto' } } : undefined,
        )}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll wide code.
        tabIndex={0}
      >
        <code>
          {result
            ? result.tokens.map((line, index) => {
                const lineKey = offset
                const spans = line.map((token) => {
                  const key = offset
                  offset += token.content.length
                  const style = token.fontStyle ?? 0
                  return (
                    <span
                      key={key}
                      style={{
                        color: token.color,
                        fontStyle: style & 1 ? 'italic' : undefined,
                        fontWeight: style & 2 ? 'bold' : undefined,
                      }}
                    >
                      {token.content}
                    </span>
                  )
                })
                offset++ // The newline between tokenized lines.
                return (
                  <Fragment key={lineKey}>
                    {index > 0 ? '\n' : null}
                    {spans}
                  </Fragment>
                )
              })
            : code}
        </code>
      </pre>
    </figure>
  )
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  const s = useStyles(proseStyles)
  return <code {...s.code}>{children}</code>
}
