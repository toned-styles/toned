import { expect, test } from 'vitest'
import { namespaceCss } from './index.ts'

test('namespaceCss is exported from the system subpath, as the README says', () => {
  expect(namespaceCss(':root{--brand:#246}', 'app')).toBe(':root{--app-brand:#246}')
})
