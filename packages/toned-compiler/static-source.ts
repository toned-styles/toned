import ts from 'typescript'
import type { DesignNode, DesignValue } from './model.ts'

/** Finite source expressions only. Unknown calls are never interpreted. */
export type StaticExpression =
  | { kind: 'ref'; name: string }
  | { kind: 'member'; base: StaticExpression; name: string }
  | {
      kind: 'object'
      entries: readonly { name?: string; value: StaticExpression }[]
    }
  | { kind: 'omit'; base: StaticExpression; names: readonly string[] }
  | { kind: 'system'; tokens: StaticExpression; node?: string }
  | { kind: 'token'; node: string }
  | { kind: 'opaque' }
export interface StaticModule {
  readonly bindings: Readonly<Record<string, StaticExpression>>
  readonly exports: Readonly<Record<string, { local: string; from?: string }>>
  readonly stars: readonly string[]
}
const opaque: StaticExpression = { kind: 'opaque' }
const unwrap = (node: ts.Expression): ts.Expression => {
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isTypeAssertionExpression(node)
  )
    node = node.expression
  return node
}
const nameOf = (node: ts.PropertyName): string | undefined =>
  ts.isIdentifier(node) ||
  ts.isStringLiteralLike(node) ||
  ts.isNumericLiteral(node)
    ? node.text
    : undefined

export function staticModule(
  source: ts.SourceFile,
  nodes: DesignNode[],
  evaluate: (node: ts.Expression) => { value: DesignValue } | undefined,
  maxNodes: number,
): StaticModule {
  const bindings: Record<string, StaticExpression> = Object.create(null)
  const exports: Record<string, { local: string; from?: string }> =
    Object.create(null)
  const stars: string[] = []
  let budget = 100_000
  const positions = new Map(nodes.map((node, index) => [node.id, index]))
  const existing = new Map(
    nodes
      .filter((node) => node.kind === 'token' || node.kind === 'system')
      .map((node) => [node.selection.start, node]),
  )
  const initializers = new Map<string, ts.Expression>()
  for (const statement of source.statements)
    if (
      ts.isVariableStatement(statement) &&
      statement.declarationList.flags & ts.NodeFlags.Const
    )
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name) && declaration.initializer)
          initializers.set(declaration.name.text, declaration.initializer)
  const tokenValues = (
    input: ts.Expression,
    depth = 0,
  ): { values: DesignValue[]; complete: boolean } | undefined => {
    if (--budget < 0 || depth > 24) return undefined
    const result = evaluate(input)
    if (result && Array.isArray(result.value))
      return { values: [...result.value], complete: true }
    const value = unwrap(input)
    if (ts.isIdentifier(value)) {
      const initializer = initializers.get(value.text)
      return initializer ? tokenValues(initializer, depth + 1) : undefined
    }
    if (!ts.isArrayLiteralExpression(value)) return undefined
    const values: DesignValue[] = []
    let complete = true
    for (const element of value.elements) {
      if (--budget < 0) return undefined
      if (ts.isSpreadElement(element)) {
        const nested = tokenValues(element.expression, depth + 1)
        if (nested) {
          values.push(...nested.values)
          complete &&= nested.complete
        } else complete = false
      } else {
        const item = evaluate(element)
        if (item) values.push(item.value)
        else complete = false
      }
    }
    return { values, complete }
  }
  const expression = (
    input: ts.Expression,
    owner: string,
    selection: ts.Node,
    depth = 0,
  ): StaticExpression => {
    if (--budget < 0 || depth > 32) return opaque
    const node = unwrap(input)
    if (ts.isIdentifier(node)) return { kind: 'ref', name: node.text }
    if (ts.isPropertyAccessExpression(node))
      return {
        kind: 'member',
        base: expression(node.expression, owner, selection, depth + 1),
        name: node.name.text,
      }
    if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression)
    )
      return {
        kind: 'member',
        base: expression(node.expression, owner, selection, depth + 1),
        name: node.argumentExpression.text,
      }
    if (ts.isObjectLiteralExpression(node))
      return {
        kind: 'object',
        entries: node.properties.map((property) => {
          if (ts.isSpreadAssignment(property))
            return {
              value: expression(
                property.expression,
                owner,
                selection,
                depth + 1,
              ),
            }
          const name = nameOf(property.name)
          if (name === undefined) return { value: opaque }
          if (ts.isShorthandPropertyAssignment(property))
            return { name, value: { kind: 'ref' as const, name } }
          return {
            name,
            value: ts.isPropertyAssignment(property)
              ? expression(property.initializer, name, property.name, depth + 1)
              : opaque,
          }
        }),
      }
    if (!ts.isCallExpression(node)) return opaque
    const called = ts.isIdentifier(node.expression)
      ? node.expression.text
      : ts.isPropertyAccessExpression(node.expression)
        ? node.expression.name.text
        : ''
    if (called === 'defineSystem' && node.arguments[0]) {
      let tokens = node.arguments[0]
      const body = unwrap(tokens)
      if (ts.isObjectLiteralExpression(body)) {
        const field = body.properties.find(
          (property): property is ts.PropertyAssignment =>
            ts.isPropertyAssignment(property) &&
            nameOf(property.name) === 'tokens',
        )
        if (field) tokens = field.initializer
      }
      return {
        kind: 'system',
        tokens: expression(tokens, owner, selection, depth + 1),
        node: existing.get(selection.getStart(source))?.id,
      }
    }
    if (called !== 'defineToken' && called !== 'defineCssToken') return opaque
    let token = existing.get(selection.getStart(source))
    let values: ts.Expression | undefined
    let complete = true
    if (called === 'defineCssToken') values = node.arguments[1]
    else {
      const body = node.arguments[0] && unwrap(node.arguments[0])
      if (body && ts.isObjectLiteralExpression(body)) {
        values = body.properties.find(
          (property): property is ts.PropertyAssignment =>
            ts.isPropertyAssignment(property) &&
            nameOf(property.name) === 'values',
        )?.initializer
        complete = !body.properties.some(
          (property) =>
            ts.isSpreadAssignment(property) ||
            (property.name &&
              (ts.isComputedPropertyName(property.name) ||
                nameOf(property.name) === 'alphaChannel')),
        )
      }
    }
    const domain = values && tokenValues(values)
    if (!token) {
      if (nodes.length >= maxNodes)
        throw new Error('Toned index: design node budget exceeded')
      token = {
        id: `${source.fileName}#static-token/${selection.getStart(source)}`,
        uri: source.fileName,
        kind: 'token',
        name: owner,
        owner,
        path: [],
        span: { start: node.getStart(source), end: node.end },
        selection: { start: selection.getStart(source), end: selection.end },
        expression: node.getText(source),
      }
      positions.set(token.id, nodes.length)
      nodes.push(token)
    }
    if (domain) {
      const next = {
        ...token,
        values: domain.values,
        valuesComplete: complete && domain.complete,
      }
      nodes[positions.get(token.id)!] = next
      token = next
    }
    existing.set(selection.getStart(source), token)
    return { kind: 'token', node: token.id }
  }
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      const exported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
      for (const declaration of statement.declarationList.declarations) {
        if (
          !declaration.initializer ||
          !(statement.declarationList.flags & ts.NodeFlags.Const)
        )
          continue
        if (ts.isIdentifier(declaration.name)) {
          bindings[declaration.name.text] = expression(
            declaration.initializer,
            declaration.name.text,
            declaration.name,
          )
          if (exported)
            exports[declaration.name.text] = { local: declaration.name.text }
        } else if (ts.isObjectBindingPattern(declaration.name)) {
          const base = expression(declaration.initializer, '', declaration.name)
          const omitted = declaration.name.elements
            .filter((element) => !element.dotDotDotToken)
            .map((element) =>
              nameOf(element.propertyName ?? (element.name as ts.PropertyName)),
            )
            .filter((name): name is string => name !== undefined)
          for (const element of declaration.name.elements)
            if (ts.isIdentifier(element.name)) {
              const name = nameOf(element.propertyName ?? element.name)
              bindings[element.name.text] =
                element.initializer || !name
                  ? opaque
                  : element.dotDotDotToken
                    ? { kind: 'omit', base, names: omitted }
                    : { kind: 'member', base, name }
              if (exported)
                exports[element.name.text] = { local: element.name.text }
            }
        }
      }
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const from =
        statement.moduleSpecifier &&
        ts.isStringLiteralLike(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const entry of statement.exportClause.elements)
          if (!entry.isTypeOnly)
            exports[entry.name.text] = {
              local: entry.propertyName?.text ?? entry.name.text,
              ...(from ? { from } : {}),
            }
      } else if (!statement.exportClause && from) stars.push(from)
    }
  }
  return { bindings, exports, stars }
}
