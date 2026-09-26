export interface WorkspaceOptions {
  readonly include?: readonly string[]
  readonly modules?: Readonly<Record<string, readonly string[]>>
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** JSON configuration only; the language server never imports workspace config code. */
export function parseWorkspaceOptions(value: unknown): WorkspaceOptions {
  if (value === undefined || value === null) return {}
  if (!record(value)) throw new Error('Invalid Toned initialization options')
  const toned = value['toned']
  if (toned === undefined) return {}
  if (!record(toned)) throw new Error('Invalid Toned workspace options')
  const include = toned['include'],
    modules = toned['modules']
  if (
    include !== undefined &&
    (!Array.isArray(include) ||
      include.length < 1 ||
      include.length > 32 ||
      include.some(
        (path) =>
          typeof path !== 'string' ||
          path.length > 512 ||
          (path !== '.' && !/^[\w.-]+(?:\/[\w.-]+)*$/.test(path)) ||
          path.split('/').includes('..'),
      ))
  )
    throw new Error(
      'Toned include needs 1–32 relative directory paths without traversal',
    )
  if (modules !== undefined && !record(modules))
    throw new Error('Toned modules must be an object')
  // Mapping contents are validated by DesignProject.configureModules, shared with other hosts.
  return {
    ...(include === undefined ? {} : { include: [...include] }),
    ...(modules === undefined
      ? {}
      : { modules: modules as Readonly<Record<string, readonly string[]>> }),
  }
}
