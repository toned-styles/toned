import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'

export interface StylesheetPlan {
  readonly ref: TokenSystem<TokenStyleDeclaration>
  readonly rules: Readonly<Record<string, unknown>>
  readonly parts: readonly string[]
  readonly variantAxes: readonly string[]
}

/** Declared part names without resolving tokens or constructing a controller.
 * Bindings can define stable module-level components before a host is installed. */
export function stylesheetParts(sheet: object): readonly string[] {
  return getStylesheetPlan(sheet).parts
}

// Definitions are module-lived; neither server requests nor mounted controllers
// register anything. Weak keys let dynamically derived override sheets expire.
const plans = new WeakMap<object, StylesheetPlan>()

export function registerStylesheetPlan(
  sheet: object,
  plan: StylesheetPlan,
): void {
  plans.set(sheet, Object.freeze(plan))
}

export function getStylesheetPlan(sheet: object): StylesheetPlan {
  const plan = plans.get(sheet)
  if (!plan)
    throw new Error(
      'Toned: expected a stylesheet created by this core instance',
    )
  return plan
}

/** Axes evidenced by authored selectors/defaults; TypeScript-only unused axes
 * have no runtime representation. */
export function stylesheetVariantAxes(sheet: object): readonly string[] {
  return getStylesheetPlan(sheet).variantAxes
}
