import { defineConfig } from '@toned/core'
import * as ReactAll from 'react'

import type { TokensContext } from './context.ts'

const React = ReactAll as unknown as typeof import('react18')

export default (context: typeof TokensContext) =>
  defineConfig({
    getTokens() {
      // @ts-expect-error
      return React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher.current?.readContext(
        context,
      )
    },
  })
