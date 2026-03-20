import { useStyles } from '@toned/react'
import { useEffect, useState } from 'react'
import { type BundledLanguage, codeToHtml } from 'shiki'
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
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    codeToHtml(children.trim(), {
      lang: detectLanguage(children),
      theme: 'github-light',
    }).then(setHtml)
  }, [children])

  if (html) {
    return (
      <div
        {...s.codeBlock}
        // biome-ignore lint/security/noDangerouslySetInnerHTML: shiki generates safe HTML
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <pre {...s.codeBlock}>
      <code>{children}</code>
    </pre>
  )
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  const s = useStyles(proseStyles)
  return <code {...s.code}>{children}</code>
}
