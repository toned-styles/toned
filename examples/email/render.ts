import { writeFile } from 'node:fs/promises'
import { render } from '@react-email/components'
import { createElement } from 'react'
import App from './App.tsx'

await writeFile(
  `${import.meta.dirname}/example.html`,
  await render(createElement(App)),
)
