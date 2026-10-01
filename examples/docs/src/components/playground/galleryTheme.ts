import { useSyncExternalStore } from 'react'

/**
 * The component gallery's themes. Each id names a block of custom-property
 * values in `styles/gallery-themes.css`; the components and their stylesheets
 * are the same in every theme.
 */
export const galleryThemes = [
  { id: 'modern', label: 'Modern' },
  { id: 'pixel', label: '8-bit' },
  { id: 'glass', label: 'Liquid glass' },
  { id: 'dos', label: 'DOS' },
  { id: 'paper', label: 'Paper' },
  { id: 'brutalist', label: 'Brutalist' },
] as const

export type GalleryThemeId = (typeof galleryThemes)[number]['id']

/** The theme the server renders, and the collection's own look. */
export const defaultGalleryTheme: GalleryThemeId = 'modern'

const storageKey = 'toned-gallery-theme'

const isTheme = (value: unknown): value is GalleryThemeId =>
  galleryThemes.some((theme) => theme.id === value)

/** The choice for this page load; storage may be unavailable. */
let current: GalleryThemeId | undefined
const listeners = new Set<() => void>()

function stored(): GalleryThemeId {
  try {
    const value = sessionStorage.getItem(storageKey)
    return isTheme(value) ? value : defaultGalleryTheme
  } catch {
    return defaultGalleryTheme
  }
}

export function currentGalleryTheme(): GalleryThemeId {
  current ??= stored()
  return current
}

/**
 * The theme is two attributes on `<html>`, so portalled overlays (children of
 * `<body>`) are inside its scope. Switching changes an attribute value only:
 * no component rerenders and no class changes.
 */
export function applyGalleryTheme(theme: GalleryThemeId) {
  const root = document.documentElement
  root.setAttribute('data-gallery-theme-scope', '')
  root.setAttribute('data-theme', theme)
}

/** Leaving the gallery returns the rest of the site to an unthemed root. */
export function clearGalleryTheme() {
  const root = document.documentElement
  root.removeAttribute('data-gallery-theme-scope')
  root.removeAttribute('data-theme')
}

export function setGalleryTheme(theme: GalleryThemeId) {
  current = theme
  try {
    sessionStorage.setItem(storageKey, theme)
  } catch {
    // Private browsing: the choice still lasts for this page load.
  }
  applyGalleryTheme(theme)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The selected theme. The server, and hydration, see the default. */
export function useGalleryTheme(): GalleryThemeId {
  return useSyncExternalStore(
    subscribe,
    currentGalleryTheme,
    () => defaultGalleryTheme,
  )
}

const noop = () => () => {}

/** True on the server and while hydrating its HTML; false once mounted. */
export function useServerMarkup(): boolean {
  return useSyncExternalStore(
    noop,
    () => false,
    () => true,
  )
}

/**
 * Runs while the server's HTML is parsed, before first paint, so a reload
 * shows the stored theme at once. Kept in step with `applyGalleryTheme`.
 */
export const galleryThemeBootScript = `(function(){try{var t=sessionStorage.getItem(${JSON.stringify(storageKey)});var r=document.documentElement;r.setAttribute('data-gallery-theme-scope','');r.setAttribute('data-theme',/^(${galleryThemes.map((theme) => theme.id).join('|')})$/.test(t)?t:${JSON.stringify(defaultGalleryTheme)})}catch(e){}})()`
