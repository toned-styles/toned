import config from '@toned-config/build/rollup.config'

import { peerDependencies } from './package.json'

export default config({
  input: ['./base/index.ts'],
  external: Object.keys({ ...peerDependencies }),
})
