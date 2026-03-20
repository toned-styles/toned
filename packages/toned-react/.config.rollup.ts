import config from '@config/build/rollup.config'

import { peerDependencies } from './package.json'

export default config({
  input: [
    './index.ts',
    './context.native.ts',
    './context.ts',
    './config.ts',
    './config.19.ts',
  ],
  external: Object.keys({ ...peerDependencies }),
})
