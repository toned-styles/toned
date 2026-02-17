import './toned.config.ts'

import { Document, Page } from '@react-pdf/renderer'
import { setConfig } from '@toned/core'
import { defineContext } from '@toned/react/context.native'
import shadcn from '@toned/themes/shadcn/config'

import Card from './Card.tsx'

const ctx = defineContext(shadcn)

setConfig({
  getTokens() {
    return ctx
  },
})

const Main = () => {
  return (
    <Document>
      <Page size="A4">
        <Card />
      </Page>
    </Document>
  )
}

export default function App() {
  return <Main />
}
