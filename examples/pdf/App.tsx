import { Document, Page } from '@react-pdf/renderer'

import Card from './Card.tsx'
import { props } from './styles.ts'

export default function App() {
  return (
    <Document>
      <Page size="A4" {...props.Page}>
        <Card />
      </Page>
    </Document>
  )
}
