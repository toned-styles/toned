import ReactPDF from '@react-pdf/renderer'
import { createElement } from 'react'

import App from './App.tsx'

ReactPDF.render(createElement(App), `${__dirname}/example.pdf`)
