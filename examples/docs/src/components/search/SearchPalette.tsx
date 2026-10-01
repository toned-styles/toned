import { useRouter } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { docsNav, headerLinks } from '../../content/nav.ts'
import { searchStyles } from '../../styles/search.ts'
import {
  type Entry,
  group,
  highlight,
  type Kind,
  type Prepared,
  search,
} from './engine.ts'
import {
  loadedSearchIndex,
  loadSearchIndex,
  readRecent,
  rememberQuery,
} from './index-loader.ts'

/** Distance from the viewport top that clears the sticky 64px header. */
const HEADER_CLEARANCE = 88

type Item = {
  key: string
  title: string
  excerpt: string
  path: string
  needles: string[]
  icon: ReactNode
} & (
  | { run: 'go'; url: string; anchor: string }
  | { run: 'fill'; query: string }
)

type Section = { title: string; items: Item[] }

const icon = (path: string) => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
)

const kindIcons: Record<Kind, ReactNode> = {
  // A page of text, an open book, a stacked box and a window.
  d: icon('M6 3h6l3 3v11H6zM12 3v3h3M8.5 10h4M8.5 13h4'),
  r: icon(
    'M10 5c-2-1.3-4-1.5-6-1v11c2-.5 4-.3 6 1 2-1.3 4-1.5 6-1V4c-2-.5-4-.3-6 1zm0 0v11',
  ),
  c: icon('M10 3l6 3.5v7L10 17l-6-3.5v-7zM4 6.5L10 10l6-3.5M10 10v7'),
  p: icon('M3 5h14v10H3zM3 8h14'),
}
const recentIcon = icon('M10 6v4l2.5 1.5M17 10a7 7 0 11-2.05-4.95M17 4v3h-3')
const searchIcon = icon('M9 15A6 6 0 109 3a6 6 0 000 12zm8 2l-3.6-3.6')

function pathOf(entry: Entry) {
  const page = entry.isPage ? [] : [entry.page]
  return [entry.group, ...page].filter(Boolean).join(' › ') || entry.url
}

function scrollToTarget(anchor: string) {
  if (!anchor) {
    window.scrollTo(0, 0)
    return
  }
  const started = performance.now()
  const align = (element: HTMLElement) => {
    const top =
      element.getBoundingClientRect().top + window.scrollY - HEADER_CLEARANCE
    window.scrollTo(0, Math.max(0, top))
    return window.scrollY
  }
  // A reference page loads its Markdown after navigation; wait for the heading.
  const tick = () => {
    const element = document.getElementById(anchor)
    if (!element) {
      if (performance.now() - started < 4000) requestAnimationFrame(tick)
      return
    }
    const settled = align(element)
    // Content above may still lay out; realign once unless the reader scrolled.
    window.setTimeout(() => {
      if (element.isConnected && window.scrollY === settled) align(element)
    }, 250)
  }
  tick()
}

function Marked({ text, needles }: { text: string; needles: string[] }) {
  const s = useStyles(searchStyles)
  return highlight(text, needles).map((part, index) =>
    part.hit ? (
      <mark key={index} {...s.Mark}>
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  )
}

function Option({
  id,
  item,
  active,
  onHover,
  onChoose,
}: {
  id: string
  item: Item
  active: boolean
  onHover: () => void
  onChoose: () => void
}) {
  const s = useStyles(searchStyles, { active })
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: focus stays in the combobox input; options are reached through aria-activedescendant
    // biome-ignore lint/a11y/useKeyWithClickEvents: the combobox input handles the keyboard
    <div
      id={id}
      role="option"
      aria-selected={active}
      {...s.Option}
      onMouseMove={active ? undefined : onHover}
      onClick={onChoose}
    >
      <span {...s.OptionIcon}>{item.icon}</span>
      <span {...s.OptionBody}>
        <span {...s.OptionTitle}>
          <Marked text={item.title} needles={item.needles} />
        </span>
        {item.excerpt && (
          <span {...s.OptionExcerpt}>
            <Marked text={item.excerpt} needles={item.needles} />
          </span>
        )}
        {item.path && <span {...s.OptionPath}>{item.path}</span>}
      </span>
      <span {...s.OptionEnter} aria-hidden="true">
        ↵
      </span>
    </div>
  )
}

/**
 * The command palette: a modal dialog holding a combobox. Focus stays in the
 * input; the arrow keys move `aria-activedescendant` through the options.
 * Mounted on the client only, when it is opened.
 */
export function SearchPalette({
  shortcut,
  onClose,
}: {
  /** Shown in the footer, e.g. "⌘K". */
  shortcut: string
  /** `restoreFocus` is false when the palette closes because it navigated. */
  onClose: (restoreFocus: boolean) => void
}) {
  const s = useStyles(searchStyles)
  const router = useRouter()
  const baseId = useId()
  const listId = `${baseId}-list`
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [index, setIndex] = useState<Prepared | undefined>(loadedSearchIndex)
  const [failed, setFailed] = useState(false)
  const [recent] = useState(readRecent)

  useEffect(() => {
    let live = true
    loadSearchIndex().then(
      (loaded) => live && setIndex(loaded),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [])

  // Lock the page behind the palette, keeping its width while the scrollbar is gone.
  useEffect(() => {
    const root = document.documentElement
    const { overflow, paddingRight } = root.style
    const scrollbar = window.innerWidth - root.clientWidth
    root.style.overflow = 'hidden'
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`
    return () => {
      root.style.overflow = overflow
      root.style.paddingRight = paddingRight
    }
  }, [])

  // Focus starts in the input and cannot leave the dialog while it is open.
  useEffect(() => {
    inputRef.current?.focus()
    const onFocus = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        panelRef.current?.contains(event.target)
      )
        return
      inputRef.current?.focus()
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  const trimmed = query.trim()
  const sections = useMemo<Section[]>(() => {
    if (!trimmed) {
      const defaults: Section[] = []
      if (recent.length > 0)
        defaults.push({
          title: 'Recent searches',
          items: recent.map((value) => ({
            key: `recent:${value}`,
            title: value,
            excerpt: '',
            path: '',
            needles: [],
            icon: recentIcon,
            run: 'fill',
            query: value,
          })),
        })
      defaults.push({
        title: 'Go to',
        items: headerLinks.map((link) => ({
          key: `link:${link.to}`,
          title: link.label,
          excerpt: '',
          path: link.to,
          needles: [],
          icon: kindIcons.p,
          run: 'go',
          url: link.to,
          anchor: '',
        })),
      })
      // The first pages of the documentation, minus any the header already lists.
      const listed = new Set<string>(headerLinks.map((link) => link.to))
      const start = docsNav[0]
      const first = start?.items.filter((item) => !listed.has(item.to)) ?? []
      if (start && first.length > 0)
        defaults.push({
          title: start.title,
          items: first.map((item) => ({
            key: `doc:${item.to}`,
            title: item.label,
            excerpt: '',
            path: item.to,
            needles: [],
            icon: kindIcons.d,
            run: 'go',
            url: item.to,
            anchor: '',
          })),
        })
      return defaults
    }
    if (!index) return []
    return group(search(index, trimmed)).map((found) => ({
      title: found.title,
      items: found.results.map(({ entry, needles, excerpt }) => ({
        key: `${entry.url}#${entry.anchor}:${entry.id}`,
        title: entry.label,
        excerpt,
        path: pathOf(entry),
        needles,
        icon: entry.isPage ? kindIcons[entry.kind] : '#',
        run: 'go',
        url: entry.url,
        anchor: entry.anchor,
      })),
    }))
  }, [trimmed, index, recent])

  const items = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  )
  const current = Math.min(active, Math.max(0, items.length - 1))
  const optionId = (position: number) => `${baseId}-option-${position}`

  // Keep the option the keyboard is on in view.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    if (current === 0) list.scrollTop = 0
    else
      document
        .getElementById(`${baseId}-option-${current}`)
        ?.scrollIntoView({ block: 'nearest' })
  }, [current, baseId])

  const choose = (item: Item | undefined) => {
    if (!item) return
    if (item.run === 'fill') {
      setQuery(item.query)
      setActive(0)
      inputRef.current?.focus()
      return
    }
    rememberQuery(trimmed)
    onClose(false)
    const { url, anchor } = item
    void router
      // The index names paths as strings; the router's types want its own union.
      .navigate({ to: url, hash: anchor || undefined } as Parameters<
        typeof router.navigate
      >[0])
      .then(() => scrollToTarget(anchor))
  }

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    const last = items.length - 1
    const move = (to: number) => {
      event.preventDefault()
      if (last >= 0) setActive(to)
    }
    if (event.key === 'ArrowDown') move(current >= last ? 0 : current + 1)
    else if (event.key === 'ArrowUp') move(current <= 0 ? last : current - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(last)
    else if (event.key === 'Enter') {
      event.preventDefault()
      choose(items[current])
    }
  }

  const onPanelKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose(true)
      return
    }
    if (event.key !== 'Tab') return
    // Tab cycles through the dialog's own controls.
    const stops = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>('input, button') ??
        []),
    ]
    const first = stops[0]
    const final = stops[stops.length - 1]
    if (!first || !final) return
    const at = document.activeElement
    if (event.shiftKey && at === first) {
      event.preventDefault()
      final.focus()
    } else if (!event.shiftKey && at === final) {
      event.preventDefault()
      first.focus()
    }
  }

  const status = !trimmed
    ? ''
    : failed
      ? 'Search is unavailable'
      : !index
        ? 'Loading…'
        : items.length === 1
          ? '1 result'
          : `${items.length} results`

  let position = 0
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a press on the scrim closes the dialog; Escape and the Close button do the same
    <div
      {...s.Overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(true)
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the documentation"
        // A part's prop bag carries its own ref; `withProps` merges ours in.
        {...s.Panel.withProps<'div'>({ ref: panelRef })}
        onKeyDown={onPanelKey}
      >
        <div {...s.InputRow}>
          {searchIcon}
          <input
            type="text"
            role="combobox"
            aria-label="Search"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              items.length > 0 ? optionId(current) : undefined
            }
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="Search docs, APIs and components"
            value={query}
            {...s.Input.withProps<'input'>({ ref: inputRef })}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={onInputKey}
          />
          <button
            type="button"
            aria-label="Close search"
            {...s.Close}
            onClick={() => onClose(true)}
          >
            Esc
          </button>
        </div>
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          {...s.List.withProps<'div'>({ ref: listRef })}
        >
          {sections.map((section) => {
            const titleId = `${baseId}-group-${section.title.replace(/\s+/g, '-')}`
            return (
              <div key={section.title} role="group" aria-labelledby={titleId}>
                <div id={titleId} role="presentation" {...s.GroupTitle}>
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const at = position++
                  return (
                    <Option
                      key={item.key}
                      id={optionId(at)}
                      item={item}
                      active={at === current}
                      onHover={() => setActive(at)}
                      onChoose={() => choose(item)}
                    />
                  )
                })}
              </div>
            )
          })}
          {trimmed && index && items.length === 0 && (
            <div {...s.Empty}>
              <span {...s.EmptyTitle}>No results for “{trimmed}”</span>
              <span>
                Check the spelling, or try a shorter or different word.
              </span>
            </div>
          )}
          {trimmed && !index && (
            <div {...s.Empty}>
              <span {...s.EmptyTitle}>
                {failed ? 'Search is unavailable' : 'Loading the search index…'}
              </span>
              {failed && (
                <span>
                  The search index could not be loaded. Try again later.
                </span>
              )}
            </div>
          )}
        </div>
        <div {...s.Footer}>
          <span {...s.Hint} aria-hidden="true">
            <kbd {...s.Key}>↑</kbd>
            <kbd {...s.Key}>↓</kbd>
            Move
          </span>
          <span {...s.Hint} aria-hidden="true">
            <kbd {...s.Key}>↵</kbd>
            Open
          </span>
          <span {...s.Hint} aria-hidden="true">
            <kbd {...s.Key}>{shortcut}</kbd>
            Toggle
          </span>
          <span role="status" aria-live="polite" {...s.Status}>
            {status}
          </span>
        </div>
      </div>
    </div>
  )
}
