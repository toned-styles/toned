/** React's declarations (and `csstype`, which they and Toned import). */
import csstype from '../../../../../../packages/toned-core/node_modules/csstype/index.d.ts?raw'
import reactGlobal from '../../../../node_modules/@types/react/global.d.ts?raw'
import react from '../../../../node_modules/@types/react/index.d.ts?raw'
import jsxRuntime from '../../../../node_modules/@types/react/jsx-runtime.d.ts?raw'

export const files: Record<string, string> = {
  '/node_modules/@types/react/index.d.ts': react,
  '/node_modules/@types/react/global.d.ts': reactGlobal,
  '/node_modules/@types/react/jsx-runtime.d.ts': jsxRuntime,
  '/node_modules/csstype/index.d.ts': csstype,
}
