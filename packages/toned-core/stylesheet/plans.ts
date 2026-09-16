import type { TokenStyleDeclaration, TokenSystem } from '../types/index.ts'

export interface StylesheetPlan {
  readonly ref: TokenSystem<TokenStyleDeclaration>
  readonly rules: Readonly<Record<string, unknown>>
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
