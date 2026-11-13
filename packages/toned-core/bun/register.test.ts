import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, expect, test } from 'vitest'

const register = fileURLToPath(new URL('./register.ts', import.meta.url))
const hasBun = spawnSync('bun', ['--version']).status === 0

const dirs: string[] = []
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

test.skipIf(!hasBun)(
  'a plain script reaches toned: imports with `bun --preload @toned/core/bun/register`',
  async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'toned-register-')))
    dirs.push(root)
    const files: Record<string, string> = {
      'package.json': JSON.stringify({ name: 'app', toned: { outputs: ['styles/*.toned.ts'] } }),
      'styles/ui.toned.ts':
        "export default { css: '.ui {}', manifest: { systemId: 'ui' }, data: { tokens: { gap: [1, 2] } } }\n",
      'script.ts': [
        "import css from 'toned:ui/css'",
        "import manifest from 'toned:ui/manifest'",
        "const tokens = (await import('toned:ui/' + 'tokens')).default",
        'console.log(JSON.stringify({ css, manifest, tokens }))',
        "await import('toned:nope/css').catch((error: Error) => console.log(error.message))",
      ].join('\n'),
    }
    for (const [path, content] of Object.entries(files)) {
      await mkdir(join(root, path, '..'), { recursive: true })
      await writeFile(join(root, path), content)
    }
    const run = spawnSync('bun', ['--preload', register, 'script.ts'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(run.stderr).toBe('')
    const [first, second] = run.stdout.trim().split('\n')
    expect(JSON.parse(first ?? '')).toEqual({
      css: '.ui {}',
      manifest: { systemId: 'ui' },
      tokens: { gap: [1, 2] },
    })
    expect(second).toBe('toned:nope is not a Toned output; the outputs are: ui')
  },
  20_000,
)
