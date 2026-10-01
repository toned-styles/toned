import { useRouter } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { marked, type Token, type Tokens } from 'marked'
import { createElement, type ReactNode, useMemo } from 'react'
import { referenceHref } from '../content/references.ts'
import { proseStyles } from '../styles/prose.ts'
import { CodeBlock } from './CodeBlock.tsx'

/**
 * A link written in Markdown. A link to a page of this site is followed by
 * the router, like every other link in the documentation; the address comes
 * from the document, so it is passed as a built `href` rather than a typed
 * route. Other links, and modified clicks, are left to the browser.
 */
function SiteLink({
  href,
  title,
  children,
}: {
  href: string
  title?: string
  children: ReactNode
}) {
  const router = useRouter()
  const internal = href.startsWith('/') && !href.startsWith('//')
  return (
    <a
      href={href}
      title={title}
      onClick={
        internal
          ? (event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              event.preventDefault()
              void router.navigate({ href })
            }
          : undefined
      }
    >
      {children}
    </a>
  )
}

/** Repository-owned Markdown, rendered as React nodes. HTML is never executed. */
export function ReferenceMarkdown({
  source,
  path,
  skipTitle,
}: {
  source: string
  path: string
  /** Drop the document's leading h1 when the page renders its own title. */
  skipTitle?: boolean
}) {
  const s = useStyles(proseStyles)
  const tokens = useMemo(() => {
    const all = marked.lexer(source)
    const first = all.findIndex((token) => token.type !== 'space')
    const leading = all[first]
    return skipTitle && leading?.type === 'heading' && leading.depth === 1
      ? all.slice(first + 1)
      : all
  }, [source, skipTitle])
  const headings = new Map<string, number>()
  function render(tokens: Token[]): ReactNode[] {
    return tokens.map((token, index) => {
      const children =
        'tokens' in token && token.tokens ? render(token.tokens) : null
      const key = `${token.type}-${index}`
      switch (token.type) {
        case 'space':
          return null
        case 'heading': {
          const heading = token as Tokens.Heading
          const base = heading.text
            .toLowerCase()
            .replace(/<[^>]*>/g, '')
            .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
            .replace(/\s/g, '-')
          const count = headings.get(base) ?? 0
          headings.set(base, count + 1)
          const id = count ? `${base}-${count}` : base
          return createElement(
            `h${heading.depth}`,
            {
              ...s[
                heading.depth === 1 ? 'h1' : heading.depth === 2 ? 'h2' : 'h3'
              ],
              id,
              key,
            },
            children,
          )
        }
        case 'paragraph':
          return <p key={key}>{children}</p>
        case 'text':
          return <span key={key}>{children ?? token.text}</span>
        case 'escape':
          return <span key={key}>{token.text}</span>
        case 'code':
          return (
            <CodeBlock key={key} lang={(token as Tokens.Code).lang}>
              {token.text}
            </CodeBlock>
          )
        case 'codespan':
          return (
            <code key={key} {...s.code}>
              {token.text}
            </code>
          )
        case 'strong':
          return <strong key={key}>{children}</strong>
        case 'em':
          return <em key={key}>{children}</em>
        case 'del':
          return <del key={key}>{children}</del>
        case 'br':
          return <br key={key} />
        case 'hr':
          return <hr key={key} />
        case 'link':
          return (
            <SiteLink
              key={key}
              href={referenceHref(token.href, path)}
              title={token.title ?? undefined}
            >
              {children}
            </SiteLink>
          )
        case 'image':
          return (
            <a key={key} href={referenceHref(token.href, path)}>
              {token.text || 'View image'}
            </a>
          )
        case 'blockquote':
          return <blockquote key={key}>{children}</blockquote>
        case 'list': {
          const list = token as Tokens.List
          const items = list.items.map((item, i) => (
            <li key={`${key}-${i}`}>
              {item.task ? (
                <input
                  aria-label={item.text}
                  type="checkbox"
                  checked={!!item.checked}
                  disabled
                />
              ) : null}
              {render(item.tokens)}
            </li>
          ))
          return list.ordered ? (
            <ol key={key} start={list.start || 1}>
              {items}
            </ol>
          ) : (
            <ul key={key}>{items}</ul>
          )
        }
        case 'table': {
          const table = token as Tokens.Table
          return (
            <div
              key={key}
              {...s.tableScroll}
              role="region"
              aria-label="Reference table"
              // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll wide reference tables.
              tabIndex={0}
            >
              <table {...s.table}>
                <thead>
                  <tr>
                    {table.header.map((cell, i) => (
                      <th key={i} scope="col">
                        {render(cell.tokens)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{render(cell.tokens)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        // Keep unsupported HTML visible as source, rather than injecting markup.
        case 'html':
          return (
            <CodeBlock key={key} lang="html" title="HTML">
              {token.text}
            </CodeBlock>
          )
        default:
          return (
            <span key={key}>
              {'text' in token ? String(token.text) : token.raw}
            </span>
          )
      }
    })
  }
  return <div {...s.container}>{render(tokens)}</div>
}
