import { describe, expect, it } from 'vitest'
import { applyDesignEdit, proposeValueEdit } from './edits.ts'
import { DesignProject } from './project.ts'
import { parseDesignDocument } from './source.ts'

export const fixture = `import { defineSystem, defineToken } from '@toned/core'
import { createElements } from '@toned/react'
type Size = 's' | 'l'
interface Mods { size: Size; disabled?: boolean }
const shared = 2
export const ui = defineSystem({id:'test',tokens:{gap:defineToken({values:[0,2,4],resolve:gap=>({gap})})}})
export const styles = ui.stylesheet({
  Root: { $kind:'view', gap:2, opacity: shared, $style:{padding:4} },
  Label: { gap:0 },
}).variants(($:Variants<Mods>,q)=>({[$.size('s')]:{Root:{gap:0}}}))
export const S = createElements(styles)
`
const uri = 'file:///workspace/button.tsx'

describe('source-connected design model', () => {
  it('extracts finite variant schemas, parts, token vocabulary and precise source spans without executing code', () => {
    const model = parseDesignDocument(
      uri,
      fixture + '\nthrow new Error("must not execute")',
      1,
    )
    expect(model.nodes.find((node) => node.kind === 'sheet')?.variants).toEqual(
      { size: ['s', 'l'], disabled: [false, true] },
    )
    expect(model.nodes.find((node) => node.kind === 'token')?.values).toEqual([
      0, 2, 4,
    ])
    expect(model.nodes.find((node) => node.kind === 'family')?.target).toBe(
      'styles',
    )
    const declaration = model.nodes.find(
      (node) =>
        node.kind === 'declaration' &&
        node.name === 'gap' &&
        node.path.length === 2,
    )!
    expect(
      fixture.slice(declaration.selection.start, declaration.selection.end),
    ).toBe('gap')
    expect(
      fixture.slice(declaration.valueSpan!.start, declaration.valueSpan!.end),
    ).toBe('2')
    expect(
      model.nodes.find((node) => node.name === 'opacity')?.opaque,
    ).toContain('not a directly editable literal')
  })
  it('retains opaque spreads and factories rather than executing or inventing declarations', () => {
    const model = parseDesignDocument(
      uri,
      'const s=ui.stylesheet(()=>getStyles());const t=ui.stylesheet({Root:{...getStyles()}})',
      1,
    )
    expect(model.diagnostics.map((entry) => entry.code)).toEqual([
      'opaque-factory',
      'opaque-member',
    ])
    expect(model.nodes.filter((node) => node.kind === 'sheet')).toHaveLength(2)
  })
  it('parses only changed documents and updates reverse import edges without reparsing consumers', () => {
    const project = new DesignProject()
    const original = project.update(uri, fixture, 1)
    project.update(
      'file:///workspace/consumer.tsx',
      'import {S} from "./button"; const App=()=> <S.Root/>',
      1,
    )
    expect(project.lookup('S', 'file:///workspace/consumer.tsx')[0]?.uri).toBe(
      uri,
    )
    expect(project.dependents(uri)).toEqual([
      uri,
      'file:///workspace/consumer.tsx',
    ])
    project.update(uri, fixture, 2)
    expect(project.statistics.parses).toBe(2)
    expect(project.get(uri)?.nodes).toBe(original.nodes)
    project.update(uri, fixture.replace('gap:2, opacity', 'gap:4, opacity'), 3)
    expect(project.statistics.parses).toBe(3)
    project.remove('file:///workspace/consumer.tsx')
    expect(project.dependents(uri)).toEqual([uri])
    project.dispose()
    expect(project.statistics.files).toBe(0)
    expect(project.lookup('S')).toEqual([])
  })
  it('rejects stale versions and visible resource bounds without partial replacement', () => {
    const project = new DesignProject({
      maxFiles: 1,
      maxCharacters: 100,
      maxDocumentCharacters: 80,
    })
    project.update(uri, 'const s=ui.stylesheet({Root:{gap:2}})', 1)
    expect(() => project.update(uri, 'x'.repeat(90), 2)).toThrow(
      'character budget',
    )
    expect(project.get(uri)?.version).toBe(1)
    expect(() => project.update('file:///other.ts', '', 0)).toThrow(
      'file budget',
    )
    expect(() => project.update(uri, 'different', 0)).toThrow('Stale')
    expect(() => project.query({ limit: 501 })).toThrow('limit')
  })
  it('finds the innermost node through a cached interval index and bounds query pages', () => {
    const project = new DesignProject()
    project.update(uri, fixture, 1)
    const offset = fixture.indexOf('padding:4') + 2
    expect(project.at(uri, offset)?.path).toEqual(['Root', '$style', 'padding'])
    const page = project.query({ kind: 'declaration', limit: 2 })
    expect(page.items).toHaveLength(2)
    expect(page.next).toBe(2)
    expect(
      project.query({ kind: 'declaration', offset: 2, limit: 2 }).items[0]?.id,
    ).not.toBe(page.items[0]?.id)
  })
  it('proposes only scoped literal edits and preserves comments/formatting outside the selected span', () => {
    const project = new DesignProject()
    project.update(uri, fixture, 1)
    const node = project.query({ kind: 'declaration', name: 'gap' }).items[0]!
    const change = proposeValueEdit(project, {
      nodeId: node.id,
      value: 4,
      expectedVersion: 1,
      scope: { uri, owner: 'styles', path: ['Root'] },
    })
    const next = applyDesignEdit(fixture, 1, change.edit)
    expect(next).toBe(fixture.replace('gap:2, opacity', 'gap:4, opacity'))
    expect(() => applyDesignEdit(fixture + ' ', 1, change.edit)).toThrow(
      'Stale',
    )
    expect(() =>
      proposeValueEdit(project, {
        nodeId: node.id,
        value: 4,
        expectedVersion: 1,
        scope: { uri, owner: 'other' },
      }),
    ).toThrow('scope')
    const opaque = project.query({ name: 'opacity' }).items[0]!
    expect(() =>
      proposeValueEdit(project, {
        nodeId: opaque.id,
        value: 1,
        expectedVersion: 1,
        scope: { uri, owner: 'styles' },
      }),
    ).toThrow('source definition')
  })
})

it.each([
  'switch (mode) { case 1: return {Root:{gap:1}} }; return {Root:{gap:2}}',
  'for (;;) { return {Root:{gap:1}} }; return {Root:{gap:2}}',
  'try { return {Root:{gap:1}} } finally {}; return {Root:{gap:2}}',
  'const styles = compute(); return {Root:{gap:styles}}',
])('keeps factories with unsupported control flow opaque: %s', (body) => {
  const document = parseDesignDocument(
    uri,
    `const s=ui.stylesheet(()=>{${body}})`,
    0,
  )
  expect(document.nodes.filter((node) => node.kind === 'declaration')).toEqual(
    [],
  )
  expect(
    document.diagnostics.some(
      (diagnostic) => diagnostic.code === 'opaque-factory',
    ),
  ).toBe(true)
})

it('resolves only immutable lexical constants and excludes shadowed symbol references', () => {
  const text = `const gap=2; let moving=3; const body={Root:{gap:1}};
    export const S=createElements(styles);
    const sheet=ui.stylesheet((gap)=>({Root:{gap, opacity:gap, width:moving}}));
    const opaque=ui.stylesheet((body)=>body);
    function nested(S) { return S }
    function hoisted() { if (true) { var S=other }; return S }
    { const S=local; consume(S) }
    consume(S);`
  const document = parseDesignDocument(uri, text, 0)
  expect(
    document.nodes.find((node) => node.name === 'opacity')?.value,
  ).toBeUndefined()
  expect(
    document.nodes.find((node) => node.name === 'width')?.value,
  ).toBeUndefined()
  expect(
    document.nodes.filter(
      (node) => node.owner === 'opaque' && node.kind === 'part',
    ),
  ).toEqual([])
  const project = new DesignProject()
  project.update(uri, text, 0)
  const references = project.referencesTo(project.lookup('S', uri)[0]!)
  expect(references.items.map((ref) => text.slice(ref.start, ref.end))).toEqual(
    ['S', 'S'],
  )
  expect(references.items[1]?.start).toBe(text.lastIndexOf('S)'))
  const consumer = 'file:///workspace/consumer.tsx'
  const consumerText = `import {S as Family} from './button'; const App=()=>Family; function local(Family){ return Family }`
  project.update(consumer, consumerText, 0)
  expect(
    project
      .referencesTo(project.lookup('S', uri)[0]!)
      .items.filter((item) => item.uri === consumer),
  ).toHaveLength(2)
})

it('owns immutable documents, nested values and snapshots across unchanged versions', () => {
  const project = new DesignProject()
  const document = project.update(
    uri,
    'const s=ui.stylesheet({Root:{options:{values:[1,2]}}})',
    0,
  )
  const node = document.nodes.find((node) => node.name === 'options')!
  expect(Object.isFrozen(document)).toBe(true)
  expect(Object.isFrozen(document.nodes)).toBe(true)
  expect(Object.isFrozen(node.path)).toBe(true)
  expect(Object.isFrozen(node.value)).toBe(true)
  expect(Object.isFrozen((node.value as { values: unknown }).values)).toBe(true)
  expect(() => {
    ;(node as { name: string }).name = 'changed'
  }).toThrow()
  const next = project.update(uri, document.text, 1)
  expect(Object.isFrozen(next)).toBe(true)
  expect(next.nodes).toBe(document.nodes)
  expect(Object.isFrozen(project.snapshot().nodes)).toBe(true)
})

it('object edits remain editable and preserve a literal __proto__ data key', () => {
  const project = new DesignProject()
  const text = 'const s=ui.stylesheet({Root:{options:{value:1}}})'
  project.update(uri, text, 0)
  const node = project.query({ name: 'options' }).items[0]!
  const value = Object.assign(Object.create(null), { nested: [true, 'value'] })
  Object.defineProperty(value, '__proto__', {
    value: { literal: true },
    enumerable: true,
  })
  const change = proposeValueEdit(project, {
    nodeId: node.id,
    value,
    expectedVersion: 0,
    scope: { uri, owner: 's' },
  })
  const next = applyDesignEdit(text, 0, change.edit)
  project.update(uri, next, 1)
  const edited = project.node(node.id)!
  expect(edited.opaque).toBeUndefined()
  expect(edited.value).toEqual(value)
  const second = proposeValueEdit(project, {
    nodeId: node.id,
    value: { again: 2 },
    expectedVersion: 1,
    scope: { uri, owner: 's' },
  })
  expect(applyDesignEdit(next, 1, second.edit)).toContain('"again": 2')
})

it('rejects forged executable edits and exposes source syntax errors', () => {
  const project = new DesignProject()
  project.update(uri, fixture, 0)
  const node = project.query({ name: 'gap', kind: 'declaration' }).items[0]!
  const { edit } = proposeValueEdit(project, {
    nodeId: node.id,
    value: 4,
    expectedVersion: 0,
    scope: { uri, owner: 'styles' },
  })
  expect(() =>
    applyDesignEdit(fixture, 0, { ...edit, after: '4, injected: evil()' }),
  ).toThrow('literal expression')
  expect(() =>
    applyDesignEdit(fixture, 0, { ...edit, after: 'evil()' }),
  ).toThrow('literal expression')
  expect(
    parseDesignDocument(uri, 'const s=ui.stylesheet({', 0).diagnostics.some(
      (item) => item.code === 'syntax-error',
    ),
  ).toBe(true)
})

it('bounds exponential literal expansion and preserves half-open source spans', () => {
  const constants = [
    'const v0=[1,2];',
    ...Array.from(
      { length: 6 },
      (_, index) =>
        `const v${index + 1}=[${Array(10).fill(`v${index}`).join(',')}];`,
    ),
  ].join('\n')
  const document = parseDesignDocument(
    uri,
    `${constants}\nconst s=ui.stylesheet({Root:{options:v6}})`,
    0,
  )
  expect(
    document.diagnostics.some((item) => item.code === 'evaluation-budget'),
  ).toBe(true)
  expect(
    document.nodes.find((node) => node.name === 'options')?.value,
  ).toBeUndefined()
  const project = new DesignProject()
  project.update(uri, fixture, 0)
  expect(project.at(uri, fixture.length)).toBeUndefined()
  expect(project.at(uri, Number.NaN)).toBeUndefined()
})

it('bounds union expansion and rejects accessor or oversized edit data before serialization', () => {
  const types = [
    "type V0='a'|'b'",
    ...Array.from(
      { length: 8 },
      (_, index) =>
        `type V${index + 1}=${Array(10).fill(`V${index}`).join('|')}`,
    ),
  ].join(';')
  const document = parseDesignDocument(
    uri,
    `${types};const s=ui.stylesheet({Root:{gap:1}}).variants(($:Variants<{size:V8}>)=>({}))`,
    0,
  )
  expect(
    document.diagnostics.some((item) => item.code === 'evaluation-budget'),
  ).toBe(true)
  const project = new DesignProject()
  project.update(uri, fixture, 0)
  const node = project.query({ name: 'gap', kind: 'declaration' }).items[0]!
  const propose = (value: any) =>
    proposeValueEdit(project, {
      nodeId: node.id,
      value,
      expectedVersion: 0,
      scope: { uri, owner: 'styles' },
    })
  let called = false
  expect(() =>
    propose({
      get secret() {
        called = true
        return 1
      },
    }),
  ).toThrow('data properties')
  expect(called).toBe(false)
  expect(() => propose('x'.repeat(100_001))).toThrow('replacement budget')
  expect(() => propose(Array(100_001))).toThrow('node budget')
})

it('refuses forged selection metadata and preserves negative zero edits', () => {
  const project = new DesignProject()
  project.update(uri, fixture, 0)
  const node = project.query({ name: 'gap', kind: 'declaration' }).items[0]!
  const { edit } = proposeValueEdit(project, {
    nodeId: node.id,
    value: -0,
    expectedVersion: 0,
    scope: { uri, owner: 'styles' },
  })
  expect(edit.after).toBe('-0')
  const next = applyDesignEdit(fixture, 0, edit)
  expect(
    Object.is(
      parseDesignDocument(uri, next, 1).nodes.find(
        (item) => item.id === node.id,
      )?.value,
      -0,
    ),
  ).toBe(true)
  expect(() =>
    applyDesignEdit(fixture, 0, { ...edit, nodeId: 'invented' }),
  ).toThrow('editable source node')
})

it('bounds deeply nested lexical resolution instead of guessing exhausted bindings', () => {
  const source =
    'const x=1;' + '{'.repeat(150) + 'unbound;'.repeat(8000) + '}'.repeat(150)
  const document = parseDesignDocument(uri, source, 0)
  expect(
    document.diagnostics.some((item) => item.code === 'binding-budget'),
  ).toBe(true)
})

it('follows bounded import chains iteratively and releases their local indexes', () => {
  const project = new DesignProject()
  project.update(
    'file:///chain/0.ts',
    'export const S=createElements(styles)',
    0,
  )
  for (let index = 1; index < 3000; index++)
    project.update(
      `file:///chain/${index}.ts`,
      `import {S} from './${index - 1}'`,
      0,
    )
  expect(project.lookup('S', 'file:///chain/2999.ts')[0]?.uri).toBe(
    'file:///chain/0.ts',
  )
  project.remove('file:///chain/0.ts')
  expect(project.lookup('S', 'file:///chain/2999.ts')).toEqual([])
  project.dispose()
  expect(project.query().total).toBe(0)
})

it('paginates reference results with usable offsets and exact totals', () => {
  const project = new DesignProject()
  project.update(
    uri,
    'const S=createElements(styles); consume(S); consume(S); consume(S)',
    0,
  )
  const node = project.lookup('S', uri)[0]!
  const first = project.referencesTo(node, { limit: 2 })
  expect(first.total).toBe(4)
  expect(first.next).toBe(2)
  const next = project.referencesTo(node, { offset: first.next, limit: 2 })
  expect(next.total).toBe(4)
  expect(next.next).toBeUndefined()
  expect(next.items).toHaveLength(2)
  expect(next.items[0]!.start).toBeGreaterThan(first.items[1]!.start)
  expect(project.referencesTo(node, { offset: 4 }).items).toEqual([])
  expect(() => project.referencesTo(node, { offset: -1 })).toThrow(
    'nonnegative offset',
  )
  expect(() => project.referencesTo(node, { limit: 501 })).toThrow('limit')
})

it('distinguishes member labels and type names from actual lexical references', () => {
  const text = `const card=ui.stylesheet({Root:{gap:1}});
    interface Props { card: string }
    type T = { card(): void }
    class K { card = 1; cardMethod(){}; get cardGetter(){return 1} }
    enum E { card }
    type Qualified = Namespace.card;
    const x=1; export { x as card }; export { card as publicCard };
    export { card as remote } from './other';
    const jsx = <X card={card} />;
    const shorthand = {card}; const computed = {[card]: 1};
    const access = Namespace.card;
    type Value = typeof card;
    card: while(false) { break card }
    consume(card);`
  const project = new DesignProject()
  project.update(uri, text, 0)
  const refs = project.referencesTo(
    project.lookup('card', uri).find((node) => node.kind === 'sheet')!,
  )
  const expected = [
    text.indexOf('card='),
    text.indexOf('card as publicCard'),
    text.indexOf('card} />'),
    text.indexOf('card};'),
    text.indexOf('card]: 1'),
    text.indexOf('card;\n    card:'),
    text.lastIndexOf('card);'),
  ]
  expect(refs.items.map((item) => item.start)).toEqual(expected)
})

it.each([
  "'red' as const",
  "('red')",
  "('red' satisfies string)",
  "(('red' /* retain this */ as const) satisfies string)",
])('literal edits preserve the initializer wrapper: %s', (initializer) => {
  const text = `const s=ui.stylesheet({Root:{color:${initializer}}})`
  const project = new DesignProject()
  project.update(uri, text, 0)
  const node = project.query({ name: 'color' }).items[0]!
  const { edit } = proposeValueEdit(project, {
    nodeId: node.id,
    value: 'green',
    expectedVersion: 0,
    scope: { uri, owner: 's' },
  })
  expect(edit.before).toBe("'red'")
  expect(applyDesignEdit(text, 0, edit)).toBe(text.replace("'red'", "'green'"))
})

it('preserves angle assertions in TypeScript files and protects asserted shared values', () => {
  const file = 'file:///workspace/angle.ts'
  const text = 'const s=ui.stylesheet({Root:{gap:(<number>2)}})'
  const project = new DesignProject()
  project.update(file, text, 0)
  const node = project.query({ name: 'gap' }).items[0]!
  const { edit } = proposeValueEdit(project, {
    nodeId: node.id,
    value: 4,
    expectedVersion: 0,
    scope: { uri: file, owner: 's' },
  })
  expect(applyDesignEdit(text, 0, edit)).toBe(
    text.replace('<number>2', '<number>4'),
  )
  const shared = parseDesignDocument(
    file,
    'const shared=2; const s=ui.stylesheet({Root:{gap:(shared as number)}})',
    0,
  )
  expect(shared.nodes.find((item) => item.name === 'gap')?.opaque).toBeDefined()
})

it('merges chained variant metadata in declaration order without reversing rules', () => {
  const text = `type First={size:'s'|'m';disabled:boolean}; type Second={size:'l';tone:'accent'|'quiet'};
    const s=ui.stylesheet({Root:{gap:1}})
      .variants(($:Variants<First>)=>({[$.size('s')]:{Root:{gap:2}}}))
      .variants(($:Variants<Second>)=>({[$.size('l')]:{Root:{gap:4}}}))`
  const document = parseDesignDocument(uri, text, 0)
  const sheet = document.nodes.find((node) => node.kind === 'sheet')!
  expect(sheet.variants).toEqual({
    size: ['l'],
    disabled: [false, true],
    tone: ['accent', 'quiet'],
  })
  expect(sheet.variantType).toBe('First -> Second')
  expect(
    document.nodes
      .filter((node) => node.kind === 'declaration' && node.name === 'gap')
      .map((node) => [node.path[0], node.value]),
  ).toEqual([
    ['Root', 1],
    ['variants:1', 2],
    ['variants:2', 4],
  ])
})

it('does not present a partial chain as a complete finite schema', () => {
  const text = `type Known={size:'s'|'m'}; const s=ui.stylesheet({Root:{gap:1}})
    .variants(($:Variants<Known>)=>({})).variants(($:Variants<ImportedMods>)=>({}))
    .variants(($:Variants<{tone:'accent'}>)=>({}))`
  const document = parseDesignDocument(uri, text, 0)
  expect(
    document.nodes.find((node) => node.kind === 'sheet')?.variants,
  ).toBeUndefined()
  expect(
    document.diagnostics.some((item) => item.code === 'opaque-variants'),
  ).toBe(true)
})

it('keeps computed keys and values as references without confusing namespace, enum or intrinsic JSX names', () => {
  const text = `const card=ui.stylesheet({Root:{gap:1}});
    namespace Inner { const card=1; consume(card) }
    enum Values { card=1, another=card }
    const view=<card/>;
    const localFunction = function card(){ return card };
    const object={ [card](card:number){return card}, get other(){return card} };
    interface Shape extends card {}
    class Extends extends card {}`
  const project = new DesignProject()
  project.update(uri, text, 0)
  const refs = project.referencesTo(
    project.lookup('card', uri).find((node) => node.kind === 'sheet')!,
  )
  expect(refs.items.map((item) => item.start)).toEqual([
    text.indexOf('card='),
    text.indexOf('card](card'),
    text.indexOf('card} };'),
    text.lastIndexOf('card {}'),
  ])
})

it.each([
  "type Unknown = { [axis: string]: 's' | 'm' }",
  "interface Unknown extends Imported { size: 's' | 'm' }",
])('does not omit unknown axes from a chained schema: %s', (declaration) => {
  const document = parseDesignDocument(
    uri,
    `${declaration};const s=ui.stylesheet({Root:{}})
    .variants(($:Variants<{tone:'accent'}>)=>({})).variants(($:Variants<Unknown>)=>({}))`,
    0,
  )
  expect(
    document.nodes.find((node) => node.kind === 'sheet')?.variants,
  ).toBeUndefined()
  expect(
    document.diagnostics.some((item) => item.code === 'opaque-variants'),
  ).toBe(true)
})
