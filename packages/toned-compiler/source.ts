import { createHash } from 'node:crypto'
import ts from 'typescript'
import type {
  DesignDiagnostic,
  DesignDocument,
  DesignImport,
  DesignKind,
  DesignNode,
  DesignReference,
  DesignValue,
  SourceSpan,
} from './model.ts'

export const sourceRevision = (text: string) =>
  createHash('sha256').update(text).digest('hex')
const span = (node: ts.Node, source: ts.SourceFile): SourceSpan => ({
  start: node.getStart(source),
  end: node.end,
})
const unwrap = (node: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(node) ||
  ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) ||
  ts.isTypeAssertionExpression(node)
    ? unwrap(node.expression)
    : node
const propertyName = (node: ts.PropertyName, source: ts.SourceFile): string =>
  ts.isIdentifier(node) ||
  ts.isStringLiteralLike(node) ||
  ts.isNumericLiteral(node)
    ? node.text
    : node.getText(source)
const callName = (node: ts.CallExpression) =>
  ts.isPropertyAccessExpression(node.expression)
    ? node.expression.name.text
    : ts.isIdentifier(node.expression)
      ? node.expression.text
      : ''

/** A lexical binding reference, not a member label or a declaration in the type namespace.
 * Computed member keys and shorthand properties remain real value references. */
function isBindingReference(node: ts.Identifier): boolean {
  const parent = node.parent
  if (
    ts.isPropertyAssignment(parent) ||
    ts.isPropertyDeclaration(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent) ||
    ts.isGetAccessorDeclaration(parent) ||
    ts.isSetAccessorDeclaration(parent) ||
    ts.isEnumMember(parent) ||
    ts.isJsxAttribute(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isTypeParameterDeclaration(parent) ||
    ts.isModuleDeclaration(parent) ||
    ts.isEnumDeclaration(parent)
  )
    return parent.name !== node
  if (ts.isPropertyAccessExpression(parent)) return parent.name !== node
  if (ts.isQualifiedName(parent)) return parent.right !== node
  if (ts.isJsxNamespacedName(parent) || ts.isNamedTupleMember(parent))
    return false
  if (
    (ts.isJsxOpeningElement(parent) ||
      ts.isJsxClosingElement(parent) ||
      ts.isJsxSelfClosingElement(parent)) &&
    parent.tagName === node &&
    /^[a-z]/.test(node.text)
  )
    return false
  if (
    ts.isLabeledStatement(parent) ||
    ts.isBreakStatement(parent) ||
    ts.isContinueStatement(parent)
  )
    return parent.label !== node
  if (ts.isImportSpecifier(parent) || ts.isBindingElement(parent))
    return parent.propertyName !== node
  if (ts.isExportSpecifier(parent)) {
    // Remote re-exports refer to another module, even when names happen to match.
    if (
      ts.isExportDeclaration(parent.parent.parent) &&
      parent.parent.parent.moduleSpecifier
    )
      return false
    return (parent.propertyName ?? parent.name) === node
  }
  // Type queries (`typeof card`) still refer to the value binding. A type
  // reference named card belongs to a separate namespace and cannot prove it.
  if (ts.isTypeReferenceNode(parent)) return false
  if (
    ts.isExpressionWithTypeArguments(parent) &&
    ts.isHeritageClause(parent.parent) &&
    ts.isInterfaceDeclaration(parent.parent.parent)
  )
    return false
  return true
}

/** An intentionally finite evaluator: never imports or executes project JavaScript. */
type EvaluationBudget = { remaining: number }
function literal(
  node: ts.Expression,
  constants: ReadonlyMap<string, ts.Expression>,
  seen = new Set<string>(),
  depth = 0,
  budget: EvaluationBudget = { remaining: 10_000 },
  shadowed: (node: ts.Identifier) => boolean = () => false,
): { value: DesignValue } | undefined {
  if (depth > 24 || --budget.remaining < 0) return undefined
  node = unwrap(node)
  if (ts.isStringLiteralLike(node)) return { value: node.text }
  if (ts.isNumericLiteral(node)) {
    const value = Number(node.text)
    return Number.isFinite(value) ? { value } : undefined
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return { value: true }
  if (node.kind === ts.SyntaxKind.FalseKeyword) return { value: false }
  if (node.kind === ts.SyntaxKind.NullKeyword) return { value: null }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  )
    return Number.isFinite(Number(node.operand.text))
      ? { value: -Number(node.operand.text) }
      : undefined
  if (ts.isIdentifier(node)) {
    const next = !shadowed(node) && constants.get(node.text)
    if (!next || seen.has(node.text)) return undefined
    return literal(
      next,
      constants,
      new Set([...seen, node.text]),
      depth + 1,
      budget,
      shadowed,
    )
  }
  if (ts.isArrayLiteralExpression(node)) {
    const values: DesignValue[] = []
    for (const element of node.elements) {
      const entry = literal(
        element,
        constants,
        seen,
        depth + 1,
        budget,
        shadowed,
      )
      if (!entry) return undefined
      values.push(entry.value)
    }
    return { value: values }
  }
  if (ts.isObjectLiteralExpression(node)) {
    const values: Record<string, DesignValue> = Object.create(null)
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) return undefined
      const computed = ts.isComputedPropertyName(property.name)
      if (computed && !ts.isStringLiteralLike(unwrap(property.name.expression)))
        return undefined
      const entry = literal(
        property.initializer,
        constants,
        seen,
        depth + 1,
        budget,
        shadowed,
      )
      if (!entry) return undefined
      const key = computed
        ? (
            unwrap(
              (property.name as ts.ComputedPropertyName).expression,
            ) as ts.StringLiteral
          ).text
        : propertyName(property.name, node.getSourceFile())
      // Bare __proto__ changes an object literal's prototype; it is not data.
      if (!computed && key === '__proto__') return undefined
      values[key] = entry.value
    }
    return { value: values }
  }
  return undefined
}

function objectBody(
  node: ts.Expression | undefined,
  constants: ReadonlyMap<string, ts.Expression>,
  seen = new Set<string>(),
  depth = 0,
  shadowed: (node: ts.Identifier) => boolean = () => false,
  allowFactory = false,
): ts.ObjectLiteralExpression | undefined {
  if (!node || depth > 24) return undefined
  node = unwrap(node)
  if (ts.isObjectLiteralExpression(node)) return node
  if (ts.isIdentifier(node)) {
    if (seen.has(node.text) || shadowed(node)) return undefined
    const next = constants.get(node.text)
    return next
      ? objectBody(
          next,
          constants,
          new Set([...seen, node.text]),
          depth + 1,
          shadowed,
          allowFactory,
        )
      : undefined
  }
  if (
    allowFactory &&
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node))
  ) {
    if (!ts.isBlock(node.body))
      return objectBody(node.body, constants, seen, depth + 1, shadowed, false)
    // Multiple/conditional returns need execution; expose an opaque factory instead.
    const [only] = node.body.statements
    if (node.body.statements.length === 1 && only && ts.isReturnStatement(only))
      return objectBody(
        only.expression,
        constants,
        seen,
        depth + 1,
        shadowed,
        false,
      )
  }
  return undefined
}

function typeValues(
  node: ts.TypeNode,
  aliases: ReadonlyMap<string, ts.TypeNode>,
  depth = 0,
  budget: EvaluationBudget = { remaining: 10_000 },
): readonly DesignValue[] | null {
  if (depth > 24 || --budget.remaining < 0) return null
  if (ts.isLiteralTypeNode(node)) {
    const value = literal(node.literal as ts.Expression, new Map())
    return value ? [value.value] : null
  }
  if (node.kind === ts.SyntaxKind.BooleanKeyword) return [false, true]
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) return []
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const next = aliases.get(node.typeName.text)
    return next ? typeValues(next, aliases, depth + 1, budget) : null
  }
  if (ts.isUnionTypeNode(node)) {
    const result: DesignValue[] = []
    for (const member of node.types) {
      const values = typeValues(member, aliases, depth + 1, budget)
      if (values === null) return null
      result.push(...values)
    }
    return [...new Set(result)]
  }
  return null
}

function variantShape(
  node: ts.TypeNode | undefined,
  aliases: ReadonlyMap<string, ts.TypeNode>,
  depth = 0,
  budget: EvaluationBudget = { remaining: 10_000 },
): Readonly<Record<string, readonly DesignValue[] | null>> | undefined {
  if (!node || depth > 24 || --budget.remaining < 0) return undefined
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName))
    return variantShape(
      aliases.get(node.typeName.text),
      aliases,
      depth + 1,
      budget,
    )
  if (!ts.isTypeLiteralNode(node)) return undefined
  const result: Record<string, readonly DesignValue[] | null> =
    Object.create(null)
  for (const member of node.members) {
    if (
      !ts.isPropertySignature(member) ||
      !member.type ||
      !member.name ||
      ts.isComputedPropertyName(member.name)
    )
      return undefined
    result[propertyName(member.name, member.getSourceFile())] = typeValues(
      member.type,
      aliases,
      0,
      budget,
    )
  }
  return result
}

export function parseDesignDocument(
  uri: string,
  text: string,
  version: number,
  options: { maxCharacters?: number; maxNodes?: number } = {},
): DesignDocument {
  if (!Number.isSafeInteger(version))
    throw new Error('Document version must be an integer')
  for (const value of Object.values(options))
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
      throw new Error('Toned index budgets must be positive integers')
  if (text.length > (options.maxCharacters ?? 1_000_000))
    throw new Error(`Toned index: document exceeds character budget: ${uri}`)
  const source = ts.createSourceFile(
    uri,
    text,
    ts.ScriptTarget.Latest,
    true,
    uri.endsWith('.tsx') || uri.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  )
  const nodes: DesignNode[] = [],
    imports: DesignImport[] = [],
    references: DesignReference[] = [],
    diagnostics: DesignDiagnostic[] = []
  const constants = new Map<string, ts.Expression>(),
    aliases = new Map<string, ts.TypeNode>()
  const declarations = new Map<string, ts.VariableDeclaration>()
  const maxNodes = options.maxNodes ?? 20_000
  const evaluationBudget = { remaining: 100_000 }
  type Scope = { parent?: Scope; bindings: Set<string>; function?: boolean }
  const globalScope: Scope = { bindings: new Set(), function: true }
  const scopes = new WeakMap<ts.Node, Scope>()
  const identifiers: ts.Identifier[] = []
  const bindName = (name: ts.BindingName, scope: Scope): void => {
    if (ts.isIdentifier(name)) scope.bindings.add(name.text)
    else
      for (const element of name.elements)
        if (ts.isBindingElement(element)) bindName(element.name, scope)
  }
  let lexicalNodes = 0
  const lexical = (node: ts.Node, scope: Scope) => {
    const outerScope = scope
    if (++lexicalNodes > 200_000)
      throw new Error(`Toned index: syntax node budget exceeded: ${uri}`)
    if (ts.isFunctionDeclaration(node) && node.name)
      scope.bindings.add(node.name.text)
    if (ts.isClassDeclaration(node) && node.name)
      scope.bindings.add(node.name.text)
    if (
      ts.isClassExpression(node) ||
      ts.isClassDeclaration(node) ||
      ts.isModuleBlock(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isFunctionLike(node) ||
      ts.isBlock(node) ||
      ts.isCatchClause(node) ||
      ts.isForStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isCaseBlock(node)
    )
      scope = {
        parent: scope,
        bindings: new Set(),
        function: ts.isFunctionLike(node),
      }
    scopes.set(node, scope)
    if (ts.isEnumDeclaration(node))
      for (const member of node.members)
        if (ts.isIdentifier(member.name)) scope.bindings.add(member.name.text)
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      let target = scope
      if (
        ts.isVariableDeclaration(node) &&
        ts.isVariableDeclarationList(node.parent) &&
        !(node.parent.flags & ts.NodeFlags.BlockScoped)
      )
        while (!target.function && target.parent) target = target.parent
      bindName(node.name, target)
    }
    if (
      (ts.isFunctionExpression(node) || ts.isClassExpression(node)) &&
      node.name
    )
      scope.bindings.add(node.name.text)
    if (ts.isImportClause(node) && node.name) scope.bindings.add(node.name.text)
    if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node))
      scope.bindings.add(node.name.text)
    if (ts.isIdentifier(node)) identifiers.push(node)
    ts.forEachChild(node, (child) =>
      lexical(
        child,
        ts.isFunctionLike(node) &&
          node.name &&
          ts.isComputedPropertyName(node.name) &&
          child === node.name
          ? outerScope
          : scope,
      ),
    )
  }
  lexical(source, globalScope)
  let bindingSteps = 1_000_000
  const uncertainScope: Scope = { bindings: new Set() }
  const bindingScope = (node: ts.Identifier): Scope | undefined => {
    for (let scope = scopes.get(node); scope; scope = scope.parent) {
      if (--bindingSteps < 0) return uncertainScope
      if (scope.bindings.has(node.text)) return scope
    }
    return undefined
  }
  const shadowed = (node: ts.Identifier) => {
    const scope = bindingScope(node)
    return scope !== undefined && scope !== globalScope
  }
  const bodyOf = (node: ts.Expression | undefined, allowFactory = false) =>
    objectBody(node, constants, new Set(), 0, shadowed, allowFactory)
  const evaluate = (node: ts.Expression, values = constants) =>
    literal(node, values, new Set(), 0, evaluationBudget, shadowed)

  let visited = 0
  const visit = (node: ts.Node) => {
    if (++visited > 200_000)
      throw new Error(`Toned index: syntax node budget exceeded: ${uri}`)
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      node.parent.parent.parent === source
    ) {
      if (
        (node.parent as ts.VariableDeclarationList).flags & ts.NodeFlags.Const
      )
        constants.set(node.name.text, node.initializer)
      declarations.set(node.name.text, node)
    }
    if (ts.isTypeAliasDeclaration(node) && node.parent === source)
      aliases.set(node.name.text, node.type)
    if (ts.isInterfaceDeclaration(node) && node.parent === source)
      aliases.set(
        node.name.text,
        node.heritageClauses?.length
          ? ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
          : ts.factory.createTypeLiteralNode(node.members),
      )
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const clause = node.importClause
      if (clause?.name)
        imports.push({
          local: clause.name.text,
          imported: 'default',
          from: node.moduleSpecifier.text,
          span: span(clause.name, source),
        })
      const bindings = clause?.namedBindings
      if (bindings && ts.isNamedImports(bindings))
        for (const entry of bindings.elements)
          imports.push({
            local: entry.name.text,
            imported: entry.propertyName?.text ?? entry.name.text,
            from: node.moduleSpecifier.text,
            span: span(entry.name, source),
          })
      if (bindings && ts.isNamespaceImport(bindings))
        imports.push({
          local: bindings.name.text,
          imported: '*',
          from: node.moduleSpecifier.text,
          span: span(bindings.name, source),
        })
    }

    ts.forEachChild(node, visit)
  }
  visit(source)
  for (const node of identifiers)
    if (isBindingReference(node) && bindingScope(node) === globalScope)
      references.push({
        name: node.text,
        span: span(node, source),
        owner: node.text,
      })
  for (const diagnostic of (
    source as ts.SourceFile & {
      parseDiagnostics?: readonly ts.DiagnosticWithLocation[]
    }
  ).parseDiagnostics ?? [])
    diagnostics.push({
      code: 'syntax-error',
      severity: 'error',
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      span: {
        start: diagnostic.start,
        end: diagnostic.start + diagnostic.length,
      },
    })
  const counts = new Map<string, number>()
  const add = (
    kind: DesignKind,
    name: string,
    owner: string,
    path: readonly string[],
    node: ts.Node,
    selection: ts.Node,
    extra: Partial<DesignNode> = {},
  ) => {
    if (nodes.length >= maxNodes)
      throw new Error(`Toned index: design node budget exceeded: ${uri}`)
    const key = [owner, kind, ...path].map(encodeURIComponent).join('/')
    const count = counts.get(key) ?? 0
    counts.set(key, count + 1)
    const entry: DesignNode = {
      id: `${uri}#${key}/${count}`,
      uri,
      kind,
      name,
      owner,
      path,
      span: span(node, source),
      selection: span(selection, source),
      ...extra,
    }
    nodes.push(entry)
    return entry
  }
  const propertyInfo = (
    property: ts.PropertyAssignment,
  ): Partial<DesignNode> => {
    // Identifier values may be inspected but edits must not silently inline a shared constant.
    const result = evaluate(property.initializer)
    const own = evaluate(property.initializer, new Map())
    return {
      // Preserve assertions, satisfies clauses, parentheses and their comments.
      // They affect type inference even though the finite evaluator unwraps them.
      valueSpan: span(
        own ? unwrap(property.initializer) : property.initializer,
        source,
      ),
      expression: property.initializer.getText(source),
      ...(result ? { value: result.value } : {}),
      ...(!own
        ? {
            opaque:
              'Expression is not a directly editable literal; edit its source definition.',
          }
        : {}),
    }
  }
  const rules = (
    body: ts.ObjectLiteralExpression,
    owner: string,
    path: readonly string[],
    insidePart: boolean,
    depth = 0,
  ) => {
    if (depth > 32) {
      diagnostics.push({
        code: 'depth-budget',
        severity: 'warning',
        message: 'Nested declaration exceeds analysis depth.',
        span: span(body, source),
      })
      return
    }
    for (const property of body.properties) {
      if (!ts.isPropertyAssignment(property)) {
        diagnostics.push({
          code: 'opaque-member',
          severity: 'information',
          message:
            'Spread, shorthand or method is visible in source but not statically expanded.',
          span: span(property, source),
        })
        continue
      }
      const name = propertyName(property.name, source),
        next = [...path, name]
      const value = unwrap(property.initializer)
      const nested = ts.isObjectLiteralExpression(value) ? value : undefined
      const condition =
        ts.isComputedPropertyName(property.name) ||
        name.startsWith('@') ||
        name.startsWith(':') ||
        name.startsWith('$named')
      if (nested && !insidePart && !condition && !name.startsWith('$')) {
        add('part', name, owner, next, property, property.name)
        rules(nested, owner, next, true, depth + 1)
      } else if (nested && (condition || name === '$style')) {
        rules(nested, owner, next, insidePart, depth + 1)
      } else
        add(
          'declaration',
          name,
          owner,
          next,
          property,
          property.name,
          propertyInfo(property),
        )
    }
  }
  for (const [owner, declaration] of declarations) {
    let expression = unwrap(declaration.initializer!)
    if (!ts.isCallExpression(expression)) continue
    if (callName(expression) === 'createElements') {
      add('family', owner, owner, [], declaration, declaration.name, {
        target: expression.arguments[0]?.getText(source),
      })
      continue
    }
    if (callName(expression) === 'defineToken') {
      const body = bodyOf(expression.arguments[0])
      const values = body?.properties.find(
        (p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p) &&
          propertyName(p.name, source) === 'values',
      )
      const result = values && evaluate(values.initializer)
      add('token', owner, owner, [], declaration, declaration.name, {
        ...(result && Array.isArray(result.value)
          ? { values: result.value }
          : {}),
        expression: expression.getText(source),
      })
      continue
    }
    if (callName(expression) === 'defineSystem') {
      add('system', owner, owner, [], declaration, declaration.name)
      const descriptor = bodyOf(expression.arguments[0])
      const tokens = descriptor?.properties.find(
        (p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p) &&
          propertyName(p.name, source) === 'tokens',
      )
      const body = tokens ? bodyOf(tokens.initializer) : descriptor
      if (body)
        for (const property of body.properties)
          if (ts.isPropertyAssignment(property)) {
            const value = unwrap(property.initializer)
            if (
              !ts.isCallExpression(value) ||
              callName(value) !== 'defineToken'
            )
              continue
            const def = bodyOf(value.arguments[0])
            const values = def?.properties.find(
              (p): p is ts.PropertyAssignment =>
                ts.isPropertyAssignment(p) &&
                propertyName(p.name, source) === 'values',
            )
            const result = values && evaluate(values.initializer)
            const name = propertyName(property.name, source)
            add('token', name, owner, [name], property, property.name, {
              ...(result && Array.isArray(result.value)
                ? { values: result.value }
                : {}),
              expression: property.initializer.getText(source),
            })
          }
      continue
    }
    const variants: ts.CallExpression[] = []
    while (
      ts.isCallExpression(expression) &&
      ts.isPropertyAccessExpression(expression.expression) &&
      callName(expression) !== 'stylesheet'
    ) {
      if (callName(expression) === 'variants') variants.push(expression)
      expression = unwrap(expression.expression.expression)
    }
    if (
      !ts.isCallExpression(expression) ||
      callName(expression) !== 'stylesheet'
    )
      continue
    // Chained declarations are applied in source order. Later schemas replace
    // repeated axes while earlier distinct axes remain available to runtime rules.
    variants.reverse()
    const variantTypes: string[] = []
    const mergedShape: Record<string, readonly DesignValue[] | null> =
      Object.create(null)
    let completeShape = true
    for (const variant of variants) {
      const factory = variant.arguments[0] && unwrap(variant.arguments[0])
      if (
        factory &&
        (ts.isArrowFunction(factory) || ts.isFunctionExpression(factory))
      ) {
        const annotation = factory.parameters[0]?.type
        const type =
          annotation && ts.isTypeReferenceNode(annotation)
            ? annotation.typeArguments?.[0]
            : variant.typeArguments?.[0]
        if (type) {
          variantTypes.push(type.getText(source))
          const shape = variantShape(type, aliases, 0, evaluationBudget)
          if (shape) Object.assign(mergedShape, shape)
          else completeShape = false
        } else completeShape = false
      } else completeShape = false
    }
    if (variants.length && !completeShape)
      diagnostics.push({
        code: 'opaque-variants',
        severity: 'information',
        message:
          'A chained variant schema is not statically known; its complete axis vocabulary requires TypeScript resolution.',
        span: span(declaration, source),
      })
    const system = ts.isPropertyAccessExpression(expression.expression)
      ? expression.expression.expression.getText(source)
      : undefined
    add('sheet', owner, owner, [], declaration, declaration.name, {
      system,
      variants: variants.length && completeShape ? mergedShape : undefined,
      // A display chain, not an invented TypeScript intersection: duplicate axes
      // use later vocabularies. A single annotation retains its original spelling.
      variantType: variantTypes.length ? variantTypes.join(' -> ') : undefined,
    })
    for (const [index, input] of [
      expression.arguments[0],
      ...variants.map((v) => v.arguments[0]),
    ].entries()) {
      const body = bodyOf(input, true)
      if (body) rules(body, owner, index ? [`variants:${index}`] : [], false)
      else if (input)
        diagnostics.push({
          code: 'opaque-factory',
          severity: 'information',
          message:
            'Factory requires execution; use renderer evidence for its effective declarations.',
          span: span(input, source),
        })
    }
  }
  nodes.sort((a, b) => a.span.start - b.span.start || b.span.end - a.span.end)
  if (evaluationBudget.remaining < 0)
    diagnostics.push({
      code: 'evaluation-budget',
      severity: 'information',
      message:
        'Static literal expansion exceeded its document budget; remaining expressions are opaque.',
      span: { start: 0, end: text.length },
    })
  if (bindingSteps < 0)
    diagnostics.push({
      code: 'binding-budget',
      severity: 'information',
      message:
        'Lexical resolution exceeded its document budget; unresolved references and values are omitted.',
      span: { start: 0, end: text.length },
    })
  return freezeDesignData({
    uri,
    version,
    revision: sourceRevision(text),
    text,
    nodes,
    imports,
    references,
    diagnostics,
  })
}

/** Freeze only model-owned plain data, never the TypeScript AST or caller input. */
export function freezeDesignData<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDesignData(child)
    Object.freeze(value)
  }
  return value
}
