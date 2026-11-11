declare module 'virtual:toned.css' {}

/** `toned:<name>/manifest`: an output's build manifest (see `@toned/core/outputs`). */
declare module 'toned:*/manifest' {
  import type { BuildManifest } from '@toned/core/build'
  const manifest: BuildManifest
  export default manifest
}

/** `toned:<name>/css`: an output's CSS as a string. */
declare module 'toned:*/css' {
  const css: string
  export default css
}

/** `toned:<name>/<key>`: other output data. Hosts may declare a precise module. */
declare module 'toned:*' {
  const value: unknown
  export default value
}
