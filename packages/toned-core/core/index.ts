/** Immutable semantic compilation, portable resolution, and development provenance. */

export type {
  CompiledPlan,
  DeclarationOperation,
  DeclarationOrigin,
  Fact,
  Facts,
  Predicate,
  ResolvedOperation,
  ShadowDiagnostic,
} from './plan.ts'
export {
  compilePlan,
  compileRules,
  explain,
  foldOperations,
  resolvePlan,
} from './plan.ts'
export type {
  LayoutContext,
  LogicalLength,
  PortableColor,
  ThemeReference,
} from './values.ts'
export { dp, percent, rgba, themeRef } from './values.ts'
