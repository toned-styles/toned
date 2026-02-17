import { useStyles } from '@toned/react'
import { proseStyles } from '../styles/prose.ts'

export function CodeBlock({ children }: { children: string }) {
  const s = useStyles(proseStyles)
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
