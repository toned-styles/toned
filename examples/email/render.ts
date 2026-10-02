import { writeFile } from 'node:fs/promises'

import { createElement } from 'react'
import { render } from 'react-email'

import App from './App.tsx'

await writeFile(
  `${import.meta.dirname}/example.html`,
  await render(createElement(App)),
)
