import { warnOnce } from '../utils/warn.ts'

/**
 * `$webRules` is the one construct whose CSS comes from sheet content, so it
 * cannot keep the guarantee that the build reads only the system. It keeps
 * working for existing applications and is deprecated: the lint rule
 * `toned/no-web-rules` and this development warning name the replacements.
 */
export const WEB_RULES_DEPRECATION =
  "Toned deprecated: $webRules generates CSS from sheet content, so the build has to read the sheet. Use declared states (conditions.states, written ':disabled') for DOM or ARIA facts, declared bridges (conditions.bridges, a token writing bridgeVarName) for pseudo-elements such as ::placeholder, registered-part relations (q.part('Item').has(…)) for a structural selector, and $bridge where it is available. Existing $webRules keep working while sheets are passed to buildStyles({ sheets })."

export function warnWebRules(): void {
  warnOnce('web-rules', WEB_RULES_DEPRECATION)
}
