import { useStyles } from '@toned/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import { searchStyles } from '../../styles/search.ts'
import { loadSearchIndex } from './index-loader.ts'
import { SearchPalette } from './SearchPalette.tsx'

const isMac = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)

const never = () => () => {}

/**
 * The visitor's platform, known only in the browser. The server and the
 * hydrating render both see `undefined`, so their markup matches; React then
 * re-renders with the real value.
 */
const usePlatform = () =>
  useSyncExternalStore<'mac' | 'other' | undefined>(
    never,
    () => (isMac() ? 'mac' : 'other'),
    () => undefined,
  )

/** True where typing is expected: a field, or the playground's code editor. */
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ) !== null
  )
}

/** Starts the index request ahead of the first query; a failure is retried on open. */
const preload = () => {
  loadSearchIndex().catch((error: unknown) => {
    console.warn('Search index preload failed; opening search retries.', error)
  })
}

/**
 * The header's search trigger, the keyboard shortcuts and the palette.
 *
 * - Cmd-K on macOS and Ctrl-K elsewhere toggle the palette from anywhere,
 *   text fields and the code editor included: neither combination types a
 *   character or has an editing meaning there. Ctrl-K on macOS is left alone,
 *   because it deletes to the end of the line in every macOS text field.
 * - `/` opens it only when focus is not in a field or the editor.
 */
export function Search() {
  const s = useStyles(searchStyles)
  const platform = usePlatform()
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  /** Where focus returns when the palette is dismissed. */
  const returnRef = useRef<HTMLElement | null>(null)
  const restoreRef = useRef(false)

  const show = useCallback(() => {
    if (openRef.current) return
    const focused = document.activeElement
    returnRef.current =
      focused instanceof HTMLElement && focused !== document.body
        ? focused
        : triggerRef.current
    openRef.current = true
    preload()
    setOpen(true)
  }, [])

  const close = useCallback((restoreFocus: boolean) => {
    if (!openRef.current) return
    openRef.current = false
    restoreRef.current = restoreFocus
    setOpen(false)
  }, [])

  // Runs after the palette has unmounted, so its focus trap is already gone.
  useLayoutEffect(() => {
    if (open || !restoreRef.current) return
    restoreRef.current = false
    const target = returnRef.current
    ;(target?.isConnected ? target : triggerRef.current)?.focus()
  }, [open])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.altKey || event.shiftKey) return
      const modifier = isMac()
        ? event.metaKey && !event.ctrlKey
        : event.ctrlKey && !event.metaKey
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (openRef.current) close(true)
        else show()
        return
      }
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.defaultPrevented &&
        !openRef.current &&
        !isEditable(event.target)
      ) {
        event.preventDefault()
        show()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [show, close])

  // `/` works everywhere, so it is the hint until the platform is known.
  const shortcut =
    platform === 'mac' ? '⌘K' : platform === 'other' ? 'Ctrl K' : '/'

  return (
    <>
      <button
        type="button"
        // The part's prop bag carries its own ref; `withProps` merges ours in.
        {...s.Trigger.withProps<'button'>({ ref: triggerRef })}
        aria-label="Search"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts={
          platform === 'mac'
            ? 'Meta+K'
            : platform === 'other'
              ? 'Control+K'
              : undefined
        }
        onFocus={preload}
        onClick={show}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M9 15A6 6 0 109 3a6 6 0 000 12zm8 2l-3.6-3.6" />
        </svg>
        <span {...s.TriggerLabel} aria-hidden="true">
          Search
        </span>
        <span {...s.TriggerHint} aria-hidden="true">
          <kbd {...s.Key}>{shortcut}</kbd>
        </span>
      </button>
      {/* In the body: the header's backdrop filter would contain a fixed child. */}
      {open &&
        createPortal(
          <SearchPalette shortcut={shortcut} onClose={close} />,
          document.body,
        )}
    </>
  )
}
