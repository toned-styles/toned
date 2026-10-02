import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Package builds publish from `.dist`, which also holds emitted test files.
    exclude: [...configDefaults.exclude, '**/.dist/**'],
  },
})
