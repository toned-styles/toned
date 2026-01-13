import './toned.config.ts'

import { Body, Html } from '@react-email/components'
import { setConfig } from '@toned/core'
import { defineContext, TokensContext } from '@toned/react/ctx'
import shadcn from '@toned/themes/shadcn/config'
import { use } from 'react'

import Card from './Card.tsx'

const ctx = defineContext(shadcn)

setConfig({
  getTokens() {
    return use(TokensContext)
  },
})

const Main = () => {
  return (
    <TokensContext.Provider value={ctx}>
      <Html>
        <Body>
          <Card />
        </Body>
      </Html>
    </TokensContext.Provider>
  )
}

export default function App() {
  return <Main />
}
