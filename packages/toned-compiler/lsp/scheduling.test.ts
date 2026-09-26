import { describe, expect, it, vi } from 'vitest'
import type { CompletionList, Connection } from 'vscode-languageserver/node.js'
import { registerLanguageServer } from './server.ts'
import { DesignLanguageService } from './service.ts'

function harness() {
  const callbacks = new Map<string, (...args: any[]) => any>()
  const sendDiagnostics = vi.fn()
  const connection = new Proxy(
    { sendDiagnostics },
    {
      get(target, key) {
        if (key === 'sendDiagnostics') return target.sendDiagnostics
        return (...args: any[]) =>
          callbacks.set(
            String(key) +
              (typeof args[0] === 'string' ? ':' + args.shift() : ''),
            args[0],
          )
      },
    },
  ) as unknown as Connection
  const service = new DesignLanguageService(),
    registration = registerLanguageServer(connection, service)
  const call = (
    name: string,
    params: unknown,
    cancellation?: { isCancellationRequested: boolean },
  ) => callbacks.get(name)!(params, cancellation)
  const open = (uri: string, text: string, version = 1) =>
    call('onDidOpenTextDocument', {
      textDocument: { uri, text, version, languageId: 'typescript' },
    })
  return { service, registration, call, open, sendDiagnostics }
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve))
const prefix = 'file:///queue/'
const sheet = `import * as ui from './system';const styles=ui.stylesheet({Root:{color:'accent'}})`
const completion = {
  textDocument: { uri: prefix + 'component.ts' },
  position: { line: 0, character: sheet.indexOf("'accent'") + 2 },
}

describe('interactive work scheduling', () => {
  it('prioritizes requested snapshots and newly imported pending dependencies over an unrelated burst', async () => {
    const h = harness()
    try {
      for (let i = 0; i < 100; i++)
        h.open(prefix + `unrelated${i}.ts`, `const value=${i}`)
      h.open(prefix + 'component.ts', sheet)
      h.open(
        prefix + 'system.ts',
        `import {color} from './tokens';const system=defineSystem({color});export const stylesheet=system.stylesheet`,
      )
      h.open(
        prefix + 'tokens.ts',
        `export const color=defineToken({values:['fresh']})`,
      )
      const result: CompletionList = await h.call('onCompletion', completion)
      expect(result.items.map((item) => item.label)).toEqual(['fresh'])
      expect(h.service.project.get(prefix + 'unrelated0.ts')).toBeUndefined()
      expect(h.service.project.statistics.parses).toBe(3)
      // Workspace-wide requests still flush all current snapshots, in bounded batches.
      const page = await h.call('onRequest:toned/inspect', { kind: 'sheet' })
      expect(page.total).toBe(1)
      expect(h.service.project.statistics.files).toBe(103)
    } finally {
      h.registration.dispose()
    }
  })
  it('coalesces edits and computes/publishes current diagnostics exactly once', async () => {
    const h = harness(),
      uri = prefix + 'component.ts'
    const diagnostics = vi.spyOn(h.service, 'diagnostics')
    try {
      h.open(uri, 'const styles=ui.stylesheet({Root:{gap:1}})')
      for (let version = 2; version <= 40; version++)
        h.call('onDidChangeTextDocument', {
          textDocument: { uri, version },
          contentChanges: [
            { text: `const styles=ui.stylesheet({Root:{gap:${version}}})` },
          ],
        })
      await h.call('onCompletion', {
        textDocument: { uri },
        position: { line: 0, character: 32 },
      })
      await tick()
      await tick()
      expect(h.service.project.statistics.parses).toBe(1)
      expect(diagnostics).toHaveBeenCalledTimes(1)
      expect(h.sendDiagnostics).toHaveBeenCalledTimes(1)
      expect(h.sendDiagnostics.mock.calls[0]?.[0].version).toBe(40)
    } finally {
      h.registration.dispose()
    }
  })
  it('revalidates changed imports after a yielded dependency walk', async () => {
    const h = harness()
    try {
      for (let i = 0; i < 20; i++)
        h.open(prefix + `dep${i}.ts`, `export const n=${i}`)
      h.open(
        prefix + 'component.ts',
        Array.from(
          { length: 20 },
          (_, i) => `import {n as n${i}} from './dep${i}';`,
        ).join('') + sheet,
      )
      h.open(
        prefix + 'system.ts',
        `const system=defineSystem({color:defineToken({values:['old']})});export const stylesheet=system.stylesheet`,
      )
      const pending = h.call('onCompletion', {
        textDocument: completion.textDocument,
        position: {
          line: 0,
          character:
            Array.from(
              { length: 20 },
              (_, i) => `import {n as n${i}} from './dep${i}';`,
            ).join('').length + completion.position.character,
        },
      })
      h.call('onDidChangeTextDocument', {
        textDocument: { uri: prefix + 'system.ts', version: 2 },
        contentChanges: [
          {
            text: `const system=defineSystem({color:defineToken({values:['new']})});export const stylesheet=system.stylesheet`,
          },
        ],
      })
      expect(
        (await pending).items.map((item: { label: string }) => item.label),
      ).toEqual(['new'])
    } finally {
      h.registration.dispose()
    }
  })
  it('cancels a suspended request and releases its interactive admission slot', async () => {
    const h = harness(),
      cancellation = { isCancellationRequested: false }
    try {
      for (let index = 0; index < 100; index++)
        h.open(
          prefix + `queued${index}.ts`,
          `const s=ui.stylesheet({Root:{gap:${index}}})`,
        )
      const request = h.call(
        'onRequest:toned/inspect',
        { kind: 'sheet' },
        cancellation,
      )
      cancellation.isCancellationRequested = true
      await expect(request).rejects.toMatchObject({ code: -32800 })
      expect(h.service.project.statistics.parses).toBeLessThan(100)
      expect(
        await h.call('onRequest:toned/inspect', { kind: 'sheet' }),
      ).toMatchObject({ total: 100 })
    } finally {
      h.registration.dispose()
    }
  })
  it('revisits new imports even when the background batch already consumed the changed root', async () => {
    const h = harness(),
      uri = prefix + 'component.ts'
    const imports = Array.from(
      { length: 20 },
      (_, i) => `import {n as n${i}} from './dep${i}';`,
    ).join('')
    const source = imports + sheet.replace("'./system'", "'./old'")
    const system = (value: string) =>
      `const system=defineSystem({color:defineToken({values:['${value}']})});export const stylesheet=system.stylesheet`
    try {
      for (let i = 0; i < 20; i++)
        h.service.project.update(
          prefix + `dep${i}.ts`,
          `export const n=${i}`,
          1,
        )
      h.service.project.update(prefix + 'old.ts', system('old'), 1)
      h.service.project.update(prefix + 'new.ts', system('stale'), 1)
      h.open(uri, source)
      h.open(prefix + 'queued-before-request.ts', 'const queued=1')
      const result = h.call('onCompletion', {
        textDocument: { uri },
        position: { line: 0, character: source.indexOf("'accent'") + 2 },
      })
      h.call('onDidChangeTextDocument', {
        textDocument: { uri, version: 2 },
        contentChanges: [{ text: source.replace("'./old'", "'./new'") }],
      })
      for (let i = 0; i < 100; i++)
        h.open(prefix + `unrelated${i}.ts`, `const n=${i}`)
      h.open(prefix + 'new.ts', system('fresh'), 2)
      expect(
        (await result).items.map((item: { label: string }) => item.label),
      ).toEqual(['fresh'])
    } finally {
      h.registration.dispose()
    }
  })

  it('revisits a formerly missing dependency that appears during a yielded request', async () => {
    const h = harness(),
      uri = prefix + 'component.ts'
    const imports = Array.from(
      { length: 20 },
      (_, i) => `import {n as n${i}} from './dep${i}';`,
    ).join('')
    const source = imports + sheet
    try {
      for (let i = 0; i < 20; i++)
        h.service.project.update(
          prefix + `dep${i}.ts`,
          `export const n=${i}`,
          1,
        )
      h.open(uri, source)
      h.open(prefix + 'queued-before-request.ts', 'const queued=1')
      const result = h.call('onCompletion', {
        textDocument: { uri },
        position: { line: 0, character: source.indexOf("'accent'") + 2 },
      })
      // Simulate the initial disk scan discovering a missing imported system.
      h.service.project.update(
        prefix + 'system.ts',
        `import {color} from './tokens';const system=defineSystem({color});export const stylesheet=system.stylesheet`,
        1,
      )
      for (let i = 0; i < 100; i++)
        h.open(prefix + `unrelated${i}.ts`, `const n=${i}`)
      h.open(
        prefix + 'tokens.ts',
        `export const color=defineToken({values:['fresh']})`,
      )
      expect(
        (await result).items.map((item: { label: string }) => item.label),
      ).toEqual(['fresh'])
    } finally {
      h.registration.dispose()
    }
  })
  it('reports relevant dependency churn as ContentModified instead of a malformed request', async () => {
    const h = harness()
    try {
      const imports = Array.from(
        { length: 8 },
        (_, i) => `import {n as n${i}} from './dep${i}';`,
      ).join('')
      for (let i = 0; i < 8; i++)
        h.service.project.update(prefix + `dep${i}.ts`, 'const x=1', 1)
      h.open(prefix + 'component.ts', imports + sheet)
      h.open(prefix + 'unrelated.ts', 'const x=2')
      let version = 0
      vi.spyOn(h.service.project, 'dependencyVersion').mockImplementation(
        () => ++version,
      )
      await expect(h.call('onCompletion', completion)).rejects.toMatchObject({
        code: -32801,
      })
    } finally {
      h.registration.dispose()
    }
  })
  it('reports saturated interactive admission as ServerCancelled and releases slots', async () => {
    const h = harness(),
      requests: Promise<unknown>[] = []
    try {
      for (let i = 0; i < 1000; i++)
        h.open(prefix + `queued${i}.ts`, `const value=${i}`)
      for (let i = 0; i < 32; i++)
        requests.push(h.call('onRequest:toned/inspect', {}))
      await expect(h.call('onRequest:toned/inspect', {})).rejects.toMatchObject(
        { code: -32802 },
      )
      await Promise.all(requests)
      await expect(
        h.call('onRequest:toned/inspect', {}),
      ).resolves.toMatchObject({ total: 0 })
    } finally {
      await Promise.allSettled(requests)
      h.registration.dispose()
    }
  })

  it('answers a large cyclic barrel closure without retaining or capping its negative candidates', async () => {
    const h = harness(),
      uri = prefix + 'component.ts'
    try {
      // Over 42,000 lexical candidates, but only 3,003 concrete documents.
      for (let i = 0; i < 3000; i++)
        h.service.project.update(
          prefix + `barrel${i}.ts`,
          `export * from './barrel${(i + 2999) % 3000}';export * from './missing${i}';export const n=${i}`,
          1,
        )
      h.service.project.update(
        prefix + 'system.ts',
        `const system=defineSystem({color:defineToken({values:['fresh']})});export const stylesheet=system.stylesheet`,
        1,
      )
      const text = `import {n} from './barrel0';` + sheet
      h.open(uri, text)
      h.open(prefix + 'unrelated.ts', 'const x=1')
      const request = {
        textDocument: { uri },
        position: { line: 0, character: text.indexOf("'accent'") + 2 },
      }
      expect(
        (await h.call('onCompletion', request)).items.map(
          (item: { label: string }) => item.label,
        ),
      ).toEqual(['fresh'])
      await h.call('onRequest:toned/inspect', {})
      const dependencies = vi.spyOn(h.service.project, 'dependencies')
      h.call('onDidChangeTextDocument', {
        textDocument: { uri, version: 2 },
        contentChanges: [{ text: text + ' ' }],
      })
      await h.call('onCompletion', request)
      expect(dependencies).not.toHaveBeenCalled()
    } finally {
      h.registration.dispose()
    }
  })
})
