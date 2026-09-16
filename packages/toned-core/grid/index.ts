/** Typed layout declarations. Geometry belongs to the selected layout engine. */
export type GridTrack = 'auto' | Readonly<{ unit: 'dp' | 'fr' | '%'; value: number }>

function track(unit: 'dp' | 'fr' | '%', value: number): GridTrack {
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`Toned grid: invalid ${unit} track ${value}`)
  return Object.freeze({ unit, value })
}

/** Fixed logical pixels, independent of the font or theme spacing scale. */
export const dp = (value: number): GridTrack => track('dp', value)
export const fr = (value: number): GridTrack => track('fr', value)
export const percent = (value: number): GridTrack => track('%', value)

export type GridPlacement = Readonly<{
  rowStart: number
  rowEnd: number
  columnStart: number
  columnEnd: number
}>

const gridBrand = Symbol('toned.grid')
const areaBrand = Symbol('toned.grid.area')

export type GridArea<Id extends string = string, Name extends string = string> = Readonly<{
  readonly [areaBrand]: true
  grid: GridDefinition<Id, Name>
  name: Name
  placement: GridPlacement
}>

export type GridDefinition<Id extends string = string, Name extends string = string> = Readonly<{
  readonly [gridBrand]: true
  id: Id
  columns: readonly GridTrack[]
  rows: readonly GridTrack[]
  areas: readonly (readonly string[])[]
  /** Fixed logical pixels. Semantic spacing tokens can supply a separate gap. */
  gap?: number
  area: <N extends Name>(name: N) => GridArea<Id, N>
}>

export function defineGrid<
  const Id extends string,
  const Matrix extends readonly (readonly string[])[],
>(
  id: Id,
  input: {
    columns: readonly GridTrack[]
    rows?: readonly GridTrack[]
    areas: Matrix
    gap?: number
  },
): GridDefinition<Id, Exclude<Matrix[number][number], '.'>> {
  type Name = Exclude<Matrix[number][number], '.'>
  if (!id) throw new Error('Toned grid: a stable nonempty id is required')
  const height = input.areas.length
  const width = input.columns.length
  if (!height || !width)
    throw new Error(`Toned grid ${id}: the matrix and columns must be nonempty`)
  if (input.rows && input.rows.length !== height)
    throw new Error(`Toned grid ${id}: row track count differs from matrix`)
  if (input.gap !== undefined && (!Number.isFinite(input.gap) || input.gap < 0))
    throw new Error(`Toned grid ${id}: invalid gap`)
  const positions = new Map<
    string,
    { top: number; left: number; bottom: number; right: number; count: number }
  >()
  input.areas.forEach((row, y) => {
    if (row.length !== width)
      throw new Error(`Toned grid ${id}: row ${y + 1} must contain ${width} cells`)
    row.forEach((name, x) => {
      if (name === '.') return
      if (!name) throw new Error(`Toned grid ${id}: area names must be nonempty`)
      const box = positions.get(name)
      if (box) {
        box.top = Math.min(box.top, y)
        box.left = Math.min(box.left, x)
        box.bottom = Math.max(box.bottom, y)
        box.right = Math.max(box.right, x)
        box.count++
      } else positions.set(name, { top: y, left: x, bottom: y, right: x, count: 1 })
    })
  })
  const placements = new Map<string, GridPlacement>()
  for (const [name, box] of positions) {
    if (box.count !== (box.bottom - box.top + 1) * (box.right - box.left + 1)) {
      throw new Error(`Toned grid ${id}: area ${name} must form one rectangle`)
    }
    placements.set(
      name,
      Object.freeze({
        rowStart: box.top + 1,
        rowEnd: box.bottom + 2,
        columnStart: box.left + 1,
        columnEnd: box.right + 2,
      }),
    )
  }
  const copyTrack = (value: GridTrack): GridTrack => {
    if (value === 'auto') return value
    if (!['dp', 'fr', '%'].includes(value.unit))
      throw new Error(`Toned grid ${id}: unsupported track unit`)
    return track(value.unit, value.value)
  }
  const definition: GridDefinition<Id, Name> = Object.freeze({
    [gridBrand]: true as const,
    id,
    columns: Object.freeze(input.columns.map(copyTrack)),
    rows: Object.freeze(
      (input.rows ?? Array.from({ length: height }, () => 'auto' as const)).map(copyTrack),
    ),
    areas: Object.freeze(input.areas.map(row => Object.freeze([...row]))),
    ...(input.gap === undefined ? {} : { gap: input.gap }),
    area<N extends Name>(name: N): GridArea<Id, N> {
      const placement = placements.get(name)
      if (!placement) throw new Error(`Toned grid ${id}: unknown area ${name}`)
      return Object.freeze({
        [areaBrand]: true as const,
        grid: definition as GridDefinition<Id, N>,
        name,
        placement,
      })
    },
  })
  return definition
}

export function isGrid(value: unknown): value is GridDefinition {
  return typeof value === 'object' && value !== null && gridBrand in value
}

export function isGridArea(value: unknown): value is GridArea {
  return typeof value === 'object' && value !== null && areaBrand in value
}

function cssTrack(value: GridTrack): string {
  return value === 'auto' ? value : `${value.value}${value.unit === 'dp' ? 'px' : value.unit}`
}

/** Pure SSR-safe output; numeric lines avoid global CSS area-name collisions. */
export function resolveGrid(
  value: GridDefinition | GridArea,
  platform: 'web' | 'native',
): Readonly<Record<string, string | number>> {
  if (platform !== 'web')
    throw new Error(
      'Toned capability grid: native grid is unavailable; scope $grid and $area to @platform web or supply an explicit native layout',
    )
  if (isGrid(value))
    return Object.freeze({
      display: 'grid',
      gridTemplateColumns: value.columns.map(cssTrack).join(' '),
      gridTemplateRows: value.rows.map(cssTrack).join(' '),
      ...(value.gap === undefined ? {} : { gap: value.gap }),
    })
  if (!isGridArea(value)) throw new Error('Toned grid: expected a definition or area reference')
  const p = value.placement
  return Object.freeze({
    gridRowStart: p.rowStart,
    gridRowEnd: p.rowEnd,
    gridColumnStart: p.columnStart,
    gridColumnEnd: p.columnEnd,
  })
}

/** One registry per mounted grid. Host adapters must pass direct layout children. */
export function createGridScope(grid: GridDefinition) {
  const targets = new Map<object, GridArea>()
  return Object.freeze({
    grid,
    attach(target: object, area: GridArea, directChild = true) {
      if (area.grid !== grid)
        throw new Error(
          `Toned grid ${grid.id}: area ${area.name} belongs to another grid definition`,
        )
      if (!directChild)
        throw new Error(
          `Toned grid ${grid.id}: an area must be a direct layout child; wrappers and portals need an explicit placement contract`,
        )
      if (targets.has(target)) throw new Error(`Toned grid ${grid.id}: target already registered`)
      // Multiple occupants are explicit CSS overlap, preserving host/source order.
      targets.set(target, area)
      let attached = true
      return () => {
        if (attached) {
          targets.delete(target)
          attached = false
        }
      }
    },
    get size() {
      return targets.size
    },
  })
}
