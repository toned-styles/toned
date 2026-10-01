import { useStyles } from '@toned/react'
import { type KeyboardEvent, useId, useRef } from 'react'

import { playgroundStyles } from '../../styles/playground.ts'
import {
  type GalleryThemeId,
  galleryThemes,
  setGalleryTheme,
  useGalleryTheme,
  useServerMarkup,
} from './galleryTheme.ts'

function Option({
  id,
  label,
  selected,
  onKeyDown,
}: {
  id: GalleryThemeId
  label: string
  selected: boolean
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}) {
  const s = useStyles(playgroundStyles, { selected })
  return (
    // A styled radio: the group below handles the arrow keys.
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      data-gallery-theme={id}
      onClick={() => setGalleryTheme(id)}
      onKeyDown={onKeyDown}
      {...s.themeOption}
    >
      {/* Coloured by gallery-themes.css from the option's theme id. */}
      <span {...s.themeSwatch} data-gallery-swatch aria-hidden="true" />
      {label}
    </button>
  )
}

/**
 * Chooses the theme the gallery's components are shown in. A radio group:
 * one tab stop, arrow keys move and select, Home and End jump to the ends.
 */
export function GalleryThemeSwitcher() {
  const s = useStyles(playgroundStyles)
  const theme = useGalleryTheme()
  // "ready" once the options respond to input; a browser test waits for it.
  const serverMarkup = useServerMarkup()
  const labelId = useId()
  const group = useRef<HTMLDivElement>(null)

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = galleryThemes.findIndex((item) => item.id === theme)
    const last = galleryThemes.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1
    const target = galleryThemes[next]
    if (!target) return
    event.preventDefault()
    setGalleryTheme(target.id)
    group.current
      ?.querySelector<HTMLElement>(`[data-gallery-theme="${target.id}"]`)
      ?.focus()
  }

  return (
    <div
      {...s.themeBar}
      data-gallery-theme-switcher={serverMarkup ? 'server' : 'ready'}
    >
      <span id={labelId} {...s.themeLabel}>
        Theme
      </span>
      <div
        {...s.themeOptions}
        ref={group}
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {galleryThemes.map((item) => (
          <Option
            key={item.id}
            id={item.id}
            label={item.label}
            selected={item.id === theme}
            onKeyDown={onKeyDown}
          />
        ))}
      </div>
    </div>
  )
}
