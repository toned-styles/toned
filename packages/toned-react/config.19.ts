import { defineConfig } from '@toned/core'
import * as ReactAll from 'react'

import type { TokensContext } from './context.ts'

const { use } = ReactAll as unknown as typeof import('react19')

export default (context: typeof TokensContext) =>
  defineConfig({
    getTokens() {
      return use(context)
    },
  })
