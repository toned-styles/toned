import { useStyles } from '@toned/react'
import { Fragment, useEffect, useState } from 'react'
import { type BundledLanguage, codeToTokens } from 'shiki'
import { proseStyles } from '../styles/prose.ts'

function detectLanguage(code: string): BundledLanguage {
  if (code.startsWith('npm ') || code.startsWith('pnpm ')) return 'bash'
  if (code.includes('import ') || code.includes('export ')) return 'tsx'
  if (code.includes(':root') || code.includes('@media') || code.includes('--'))
    return 'css'
  return 'tsx'
}

export function CodeBlock({ children }: { children: string }) {
  const s = useStyles(proseStyles)
  const [highlighted, setHighlighted] = useState<{
    source: string
    result: Awaited<ReturnType<typeof codeToTokens>>
  } | null>(null)

  useEffect(() => {
    let active = true
    codeToTokens(children.trim(), {
      lang: detectLanguage(children),
      theme: 'github-light',
    }).then(
      (result) => {
        if (active) setHighlighted({ source: children, result })
      },
      () => {
        // Plain code stays readable if a highlighter language cannot load.
        if (active) setHighlighted(null)
      },
    )
    return () => {
      active = false
    }
  }, [children])

  const result = highlighted?.source === children ? highlighted.result : null
  let offset = 0
  const lines = result?.tokens.map((tokens) => {
    const key = offset
    const spans = tokens.map((token) => {
      const key = offset
      offset += token.content.length
      return { key, token }
    })
    offset++ // Account for the newline between tokenized source lines.
    return { key, spans }
  })

  return (
    <pre
      {...s.codeBlock.with({
        style: { color: result?.fg, backgroundColor: result?.bg },
      })}
    >
      <code>
        {lines
          ? lines.map(({ key, spans }) => (
              <Fragment key={key}>
                {key > 0 ? '\n' : null}
                {spans.map(({ key, token }) => (
                  <span
                    key={key}
                    style={{
                      color: token.color,
                      fontStyle:
                        (token.fontStyle ?? 0) & 1 ? 'italic' : undefined,
                      fontWeight:
                        (token.fontStyle ?? 0) & 2 ? 'bold' : undefined,
                      textDecoration:
                        (token.fontStyle ?? 0) & 4 ? 'underline' : undefined,
                    }}
                  >
                    {token.content}
                  </span>
                ))}
              </Fragment>
            ))
          : children}
      </code>
    </pre>
  )
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  const s = useStyles(proseStyles)
  return <code {...s.code}>{children}</code>
}
