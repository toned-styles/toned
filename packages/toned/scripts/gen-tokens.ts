#!/usr/bin/env bun

import assert from 'node:assert'
import * as path from 'node:path'
import { parseArgs } from 'node:util'

import type { Tokens } from '@toned/core'

const { positionals } = parseArgs({
  strict: true,
  allowPositionals: true,
})

const [filepath, output] = positionals

assert(filepath && output, 'filepath and output are requried')

const tokens = (await import(path.join(process.cwd(), filepath))) as {
  default: Tokens
}

await Bun.write(
  path.resolve(process.cwd(), output),
  `:root {
${Object.entries(tokens.default)
  .map(([key, value]) => `--${key}: ${value}`)
  .join(';\n')}
}`,
  { createPath: true },
)
