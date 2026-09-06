/**
 * The condition model behind every `'@…'` stylesheet key.
 *
 * A condition key is `@` + a flat boolean expression in disjunctive normal
 * form: OR-clauses (`|`) of AND-ed (`&`), possibly negated (`!`) ATOMS. An
 * atom is one of:
 *
 *   - `md` — a declared viewport breakpoint,
 *   - `field-group/md` — a declared step of a named container,
 *   - `card/>=25rem` — an AD-HOC min-width on a declared container name
 *     (numbers are px). Only `>=` exists: `width < X` is `!name/>=X`, so the
 *     whole comparison surface is min-width plus algebra.
 *
 * The algebra costs nothing new architecturally, because it maps onto the
 * chain machinery that already exists:
 *
 *   - AND — a product guard (`var(--a) var(--b) value`), exactly how compound
 *     pseudo keys (`':open:hover'`) already compile;
 *   - OR  — adjacent links in the fallback chain sharing one value;
 *   - NOT — a complement toggle (`--<atom>-not`) emitted beside every
 *     positive toggle, valid-empty exactly when the positive is invalid.
 *
 * On native the same expressions evaluate as booleans against measured
 * container sizes and the runtime media mods — cross-platform by construction.
 *
 * Container NAMES stay declared (they define the roots, the native
 * measurement, and the typed builder); condition VALUES are free at the use
 * site.
 *
 * @module utils/conditions
 */

import { camelToKebab } from './css.ts'

export type ConditionAtom = {
  /** Container name, or null for a viewport breakpoint atom. */
  container: string | null
  /** Declared breakpoint/step name, or null for an ad-hoc width. */
  step: string | null
  /** Ad-hoc min-width (px number, or a css length string) when step is null. */
  min: number | string | null
  negated: boolean
}

/** AND of atoms. */
export type ConditionClause = ConditionAtom[]
/** OR of clauses — the whole expression, in DNF. */
export type ConditionExpr = ConditionClause[]

/**
 * Parse a condition key (without its leading `@`). Returns null for a key
 * that is not a condition expression (e.g. `platform.web`, which is resolved
 * before compilation and must never reach the chain machinery).
 */
export function parseConditionKey(key: string): ConditionExpr | null {
  if (key.startsWith('platform.')) return null
  const clauses: ConditionExpr = []
  for (const clauseSrc of key.split('|')) {
    const clause: ConditionClause = []
    for (const atomSrc of clauseSrc.split('&')) {
      const negated = atomSrc[0] === '!'
      const body = negated ? atomSrc.slice(1) : atomSrc
      if (body.length === 0) return null
      const slash = body.indexOf('/')
      if (slash === -1) {
        clause.push({ container: null, step: body, min: null, negated })
        continue
      }
      const container = body.slice(0, slash)
      const rest = body.slice(slash + 1)
      if (container.length === 0 || rest.length === 0) return null
      if (rest.startsWith('>=')) {
        const raw = rest.slice(2)
        if (raw.length === 0) return null
        const min = /^\d+$/.test(raw) ? Number(raw) : raw
        clause.push({ container, step: null, min, negated })
      } else {
        clause.push({ container, step: rest, min: null, negated })
      }
    }
    clauses.push(clause)
  }
  return clauses
}

/** One clause, one positive atom — the shape the pre-algebra keys had. */
export function isSimpleExpr(expr: ConditionExpr): boolean {
  return expr.length === 1 && expr[0]!.length === 1 && !expr[0]![0]!.negated
}

/** Serialize an expression back to its canonical key body (no `@`). */
export function serializeExpr(expr: ConditionExpr): string {
  return expr
    .map((clause) => clause.map(serializeAtom).join('&'))
    .join('|')
}

function serializeAtom(atom: ConditionAtom): string {
  const neg = atom.negated ? '!' : ''
  if (atom.container === null) return `${neg}${atom.step}`
  if (atom.step !== null) return `${neg}${atom.container}/${atom.step}`
  return `${neg}${atom.container}/>=${atom.min}`
}

/** A css length as a var-name-safe slug: `22.5rem` → `22p5rem`. */
function lengthSlug(value: number | string): string {
  return String(value)
    .replace(/\./g, 'p')
    .replace(/[^a-zA-Z0-9]/g, '')
}

/**
 * The atom's toggle slug — WITHOUT polarity, matching the pre-algebra names:
 * `media-md`, `cq-field-group-md`, `cq-card-gte400`.
 */
export function atomSlug(atom: ConditionAtom): string {
  if (atom.container === null) return `media-${camelToKebab(atom.step!)}`
  const name = camelToKebab(atom.container)
  return atom.step !== null
    ? `cq-${name}-${camelToKebab(atom.step)}`
    : `cq-${name}-gte${lengthSlug(atom.min!)}`
}

/**
 * The toggle custom property the atom guards on: the positive toggle, or its
 * `-not` complement for a negated atom.
 */
export function atomToggleVar(atom: ConditionAtom): string {
  return `--${atomSlug(atom)}${atom.negated ? '-not' : ''}`
}

/** A clause's slug — names the per-property parameter var uniquely. */
export function clauseSlug(clause: ConditionClause): string {
  return clause
    .map((a) => `${a.negated ? 'not-' : ''}${atomSlug(a)}`)
    .join('-and-')
}

/** A clause's guard: the product of its atoms' toggle vars. */
export function clauseGuard(clause: ConditionClause): string {
  return clause.map((a) => `var(${atomToggleVar(a)})`).join(' ')
}

/**
 * A length in px for runtime comparison and scale sorting. A NUMBER is
 * multiplied by `unitPx` — for CONTAINER widths that is the system's `base`
 * (default 4px), so numeric values ride the same universal spacing scale as
 * every other numeric token (`min(100)` is 400px exactly as `gap: 2` is
 * 8px); rem does not exist on native. Breakpoint numbers keep their legacy
 * px meaning (`unitPx` 1). A parenthesised string is a raw css condition —
 * not runtime-evaluable, so Infinity (never matches off the web, sorts
 * outermost on it); other strings are css lengths (rem/em at 16px per rem,
 * a web-only escape).
 */
export function lengthToPx(value: number | string, unitPx = 1): number {
  if (typeof value === 'number') return value * unitPx
  if (value.startsWith('(')) return Number.POSITIVE_INFINITY
  return (
    Number.parseFloat(value) *
    (value.endsWith('rem') || value.endsWith('em') ? 16 : 1)
  )
}

export type ConditionEnv = {
  /** Truth of a declared viewport breakpoint, undefined when unknown. */
  media: (name: string) => boolean | undefined
  /** Measured inline size (px) of a named container, undefined when unmeasured. */
  containerPx: (name: string) => number | undefined
  /** A declared container step's width, undefined for an unknown step. */
  stepWidth: (container: string, step: string) => number | string | undefined
  /** px per numeric unit for container widths — the system's `base` (4). */
  basePx: number
}

/**
 * Evaluate an expression at runtime. An unmeasured container acts as width 0
 * and an unknown media state as false — the mobile-first reading — BEFORE
 * negation, so `!card/>=400` is true for an unmeasured card exactly as it is
 * for a narrow one.
 */
export function evalExpr(expr: ConditionExpr, env: ConditionEnv): boolean {
  return expr.some((clause) =>
    clause.every((atom) => {
      let truth: boolean
      if (atom.container === null) {
        truth = env.media(atom.step!) === true
      } else {
        const width =
          atom.step !== null
            ? env.stepWidth(atom.container, atom.step)
            : atom.min!
        truth =
          width !== undefined &&
          (env.containerPx(atom.container) ?? 0) >= lengthToPx(width, env.basePx)
      }
      return atom.negated ? !truth : truth
    }),
  )
}

/**
 * The container atoms an expression uses that need GENERATED toggles beyond
 * the declared scales — the ad-hoc min-width atoms. Stylesheet creation
 * registers these on the system ref; the css generator emits a toggle (and
 * its complement) for each registered atom.
 */
/**
 * Walk a rules tree and register every ad-hoc condition atom it uses (as
 * canonical `name/>=len` strings). Called at stylesheet creation so a css
 * generator that imported the stylesheet modules can emit exactly the
 * toggles in use. Depth-limited: condition keys live at the root, element
 * and variant-entry levels; nothing legitimate sits deeper.
 */
export function collectAdHocConditions(
  node: unknown,
  out: Set<string>,
  depth = 0,
): void {
  if (!node || typeof node !== 'object' || depth > 5) return
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key[0] === '@' && !key.startsWith('@platform.')) {
      const expr = parseConditionKey(key.slice(1))
      if (expr) {
        for (const atom of adHocAtoms(expr)) {
          out.add(`${atom.container}/>=${atom.min}`)
        }
      }
    }
    collectAdHocConditions(value, out, depth + 1)
  }
}

export function adHocAtoms(expr: ConditionExpr): ConditionAtom[] {
  const out: ConditionAtom[] = []
  for (const clause of expr) {
    for (const atom of clause) {
      if (atom.container !== null && atom.step === null) {
        out.push({ ...atom, negated: false })
      }
    }
  }
  return out
}
