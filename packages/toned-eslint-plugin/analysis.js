/** Syntax-only binding analysis. No project, module execution, filesystem or global cache. */
/**
 * Finite analysis results keep the mutually recursive resolver's inferred type
 * bounded. Host-bag fields retain only the bag identity, never another resolver.
 * @typedef {{ kind: 'part-bag', origin: object, part: string }} PartBag
 * @typedef {{ kind: 'namespace', module: string }
 * | { kind: 'api' | 'query-method' | 'sheet-method', name: string }
 * | { kind: 'system' | 'query' | 'query-part' | 'query-key' | 'sheet' | 'family' | 'family-part' }
 * | { kind: 'bags', origin: object }
 * | PartBag
 * | { kind: 'bag-field', bag: PartBag, field: string }
 * | { kind: 'bag-merge', bag: PartBag }} Binding
 */
/**
 * Keep this projection outside the recursive resolver: returning callee.bag
 * directly makes its inferred return type recursively index itself in Biome.
 * @param {{ bag: PartBag }} binding
 * @returns {PartBag}
 */
function mergedBag(binding) {
  return binding.bag
}
const apiNames = [
  'defineSystem',
  'stylesheet',
  'createStylesheet',
  'overrideSheet',
  'createElements',
  'useStyles',
  'setConfig',
]
const core = Object.fromEntries(
  apiNames.map((name) => [
    name,
    name === 'createStylesheet' ? 'stylesheet' : name,
  ]),
)
const defaults = {
  '@toned/core': core,
  '@toned/core/stylesheet': core,
  '@toned/core/config': { setConfig: 'setConfig' },
  '@toned/react': core,
  react: Object.fromEntries(
    ['memo', 'forwardRef', 'useMemo', 'useState'].map((name) => [name, name]),
  ),
  'react-native': Object.fromEntries(
    ['View', 'Text', 'Image', 'Pressable', 'ScrollView', 'TextInput'].map(
      (name) => [name, 'host'],
    ),
  ),
}
export function propertyName(node) {
  if (!node) return undefined
  if (!node.computed && node.key?.type === 'Identifier') return node.key.name
  if (node.key?.type === 'Literal' && typeof node.key.value === 'string')
    return node.key.value
  if (
    !node.computed &&
    ['Identifier', 'JSXIdentifier'].includes(node.property?.type)
  )
    return node.property.name
  if (
    node.property?.type === 'Literal' &&
    typeof node.property.value === 'string'
  )
    return node.property.value
}
export function unwrap(node) {
  while (
    node &&
    [
      'TSAsExpression',
      'TSSatisfiesExpression',
      'TSNonNullExpression',
      'ChainExpression',
      'ParenthesizedExpression',
    ].includes(node.type)
  )
    node = node.expression
  return node
}
export function createAnalysis(context, options = {}) {
  const source = context.sourceCode ?? context.getSourceCode()
  const modules = { ...defaults, ...options.modules }
  /** @type {WeakMap<object, Binding | null>} */
  const cache = new WeakMap()
  const visiting = new Set()
  function variable(node) {
    for (let scope = source.getScope(node); scope; scope = scope.upper) {
      const found = scope.set.get(node.name)
      if (found) return found
    }
  }
  /** @returns {Binding | null} */
  function member(object, name) {
    if (!object || !name) return null
    if (object.kind === 'namespace')
      return modules[object.module]?.[name]
        ? { kind: 'api', name: modules[object.module][name] }
        : null
    if (object.kind === 'system' && name === 'q') return { kind: 'query' }
    if (
      object.kind === 'query' &&
      [
        'all',
        'any',
        'not',
        'media',
        'container',
        'state',
        'platform',
        'part',
      ].includes(name)
    )
      return { kind: 'query-method', name }
    if (object.kind === 'query-part' && ['state', 'has'].includes(name))
      return { kind: 'query-method', name }
    if (object.kind === 'system' && name === 'stylesheet')
      return { kind: 'api', name: 'stylesheet' }
    if (
      object.kind === 'sheet' &&
      ['extend', 'variants', 'defaults'].includes(name)
    )
      return { kind: 'sheet-method', name }
    if (object.kind === 'bags')
      return { kind: 'part-bag', origin: object.origin, part: name }
    if (
      object.kind === 'part-bag' &&
      ['style', 'className', 'ref'].includes(name)
    )
      return { kind: 'bag-field', bag: object, field: name }
    if (object.kind === 'part-bag' && name === 'withProps')
      return { kind: 'bag-merge', bag: object }
    if (object.kind === 'family') return { kind: 'family-part' }
    return null
  }
  /** @returns {Binding | null} */
  function binding(found, depth) {
    if (!found || depth > 32 || visiting.has(found)) return null
    if (cache.has(found)) return cache.get(found)
    visiting.add(found)
    let result = null
    const def = found.defs[0]
    if (def?.type === 'ImportBinding') {
      const specifier = def.node,
        declaration = def.parent ?? specifier.parent
      if (
        declaration.importKind !== 'type' &&
        specifier.importKind !== 'type'
      ) {
        const module = declaration.source?.value
        if (
          specifier.type === 'ImportNamespaceSpecifier' ||
          (specifier.type === 'ImportDefaultSpecifier' && module === 'react')
        )
          result = { kind: 'namespace', module }
        else if (specifier.type === 'ImportSpecifier') {
          const name = specifier.imported.name ?? specifier.imported.value
          if (modules[module]?.[name])
            result = { kind: 'api', name: modules[module][name] }
        }
      }
    } else if (def?.type === 'Parameter') {
      const fn = def.node
      const call = fn?.parent
      if (isFunction(fn) && call?.type === 'CallExpression') {
        const callee = resolve(call.callee, depth + 1)
        const index = fn.params.findIndex(
          (param) => param.type === 'Identifier' && param.name === found.name,
        )
        if (
          (callee?.kind === 'api' &&
            callee.name === 'stylesheet' &&
            index === 0) ||
          (callee?.kind === 'sheet-method' &&
            callee.name === 'extend' &&
            index === 0) ||
          (callee?.kind === 'sheet-method' &&
            callee.name === 'variants' &&
            index === 1) ||
          (callee?.kind === 'api' &&
            callee.name === 'overrideSheet' &&
            ((call.arguments[1] === fn && index === 0) ||
              (call.arguments[2] === fn && index === 1)))
        )
          result = { kind: 'query' }
      }
    } else if (def?.type === 'Variable' && def.node?.parent?.kind === 'const') {
      const declaration = def.node
      if (declaration.id.type === 'Identifier')
        result = resolve(declaration.init, depth + 1)
      else if (declaration.id.type === 'ObjectPattern') {
        const property = declaration.id.properties.find(
          (p) =>
            p.type === 'Property' &&
            p.value?.type === 'Identifier' &&
            p.value.name === found.name,
        )
        if (property)
          result = member(
            resolve(declaration.init, depth + 1),
            propertyName(property),
          )
      }
    }
    visiting.delete(found)
    cache.set(found, result)
    return result
  }
  /** @returns {Binding | null} */
  function resolve(input, depth = 0) {
    const node = unwrap(input)
    if (!node || depth > 32) return null
    if (node.type === 'Identifier' || node.type === 'JSXIdentifier')
      return binding(variable(node), depth + 1)
    if (['MemberExpression', 'JSXMemberExpression'].includes(node.type))
      return member(resolve(node.object, depth + 1), propertyName(node))
    if (node.type === 'CallExpression') {
      const callee = resolve(node.callee, depth + 1)
      if (callee?.kind === 'query-method')
        return { kind: callee.name === 'part' ? 'query-part' : 'query-key' }
      if (callee?.kind === 'bag-merge') return mergedBag(callee)
      if (callee?.kind === 'sheet-method') return { kind: 'sheet' }
      if (callee?.kind !== 'api') return null
      if (callee.name === 'defineSystem') return { kind: 'system' }
      if (['stylesheet', 'overrideSheet'].includes(callee.name))
        return { kind: 'sheet' }
      if (callee.name === 'useStyles') return { kind: 'bags', origin: node }
      if (callee.name === 'createElements') return { kind: 'family' }
    }
    return null
  }
  return { source, resolve }
}
const isFunction = (node) =>
  node &&
  [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
  ].includes(node.type)
function functionName(node) {
  return (
    node.id?.name ??
    (node.parent?.type === 'VariableDeclarator'
      ? node.parent.id?.name
      : undefined)
  )
}
export function inRender(node, analysis) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (!isFunction(parent)) continue
    const name = functionName(parent)
    if (name && (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name))) return true
    if (!name && parent.parent?.type === 'ExportDefaultDeclaration') {
      // An anonymous default can be a component, but directly returning a
      // proven family is a factory, not a React render result.
      const body = parent.body
      const result =
        body.type === 'BlockStatement'
          ? body.body.length === 1 && body.body[0].type === 'ReturnStatement'
            ? body.body[0].argument
            : null
          : body
      return analysis.resolve(result)?.kind !== 'family'
    }
    if (parent.parent?.type === 'MethodDefinition')
      return propertyName(parent.parent) === 'render'
    const call =
      parent.parent?.type === 'CallExpression'
        ? analysis.resolve(parent.parent.callee)
        : null
    if (call?.kind === 'api' && ['memo', 'forwardRef'].includes(call.name))
      return true
    if (call?.kind === 'api' && ['useMemo', 'useState'].includes(call.name))
      continue
    return false // Event handlers and arbitrary callbacks are not render bodies.
  }
  return false
}
function returnedObjects(input) {
  const node = unwrap(input)
  if (node?.type === 'ObjectExpression') return [node]
  if (!isFunction(node)) return []
  if (node.body.type !== 'BlockStatement') return returnedObjects(node.body)
  return node.body.body
    .filter((n) => n.type === 'ReturnStatement')
    .flatMap((n) => returnedObjects(n.argument))
}
/** Walk only declaration grammar. Token payloads, $style contents and webRules are opaque. */
export function declarations(call, analysis, visit) {
  const callee = analysis.resolve(call.callee)
  let inputs
  if (callee?.kind === 'api' && callee.name === 'stylesheet')
    inputs = [call.arguments[0]]
  else if (callee?.kind === 'api' && callee.name === 'overrideSheet')
    inputs = [call.arguments[1], call.arguments[2]]
  else if (
    callee?.kind === 'sheet-method' &&
    ['extend', 'variants'].includes(callee.name)
  )
    inputs = [call.arguments[0]]
  else return
  let remaining = 4096
  function walk(object, local, depth) {
    if (depth > 32 || --remaining < 0) return
    for (const property of object.properties) {
      if (property.type !== 'Property') continue
      const name = propertyName(property),
        value = unwrap(property.value)
      if (local) visit(property, object)
      if (value?.type !== 'ObjectExpression') continue
      if (
        name &&
        (name.startsWith('@') ||
          name.startsWith(':') ||
          name.startsWith('[') ||
          name.includes(':'))
      )
        walk(value, local, depth + 1)
      else if (
        property.computed &&
        analysis.resolve(property.key)?.kind === 'query-key'
      )
        walk(value, local, depth + 1)
      else if (!local && property.computed && !name)
        walk(value, false, depth + 1)
      else if (!local && name && !name.startsWith('$'))
        walk(value, true, depth + 1)
    }
  }
  for (const object of inputs.flatMap(returnedObjects)) walk(object, false, 0)
}
export function sameBag(left, right) {
  return (
    left?.kind === 'part-bag' &&
    right?.kind === 'part-bag' &&
    left.origin === right.origin &&
    left.part === right.part
  )
}
export const optionsSchema = {
  type: 'object',
  properties: {
    modules: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: { type: 'string', enum: [...apiNames, 'host'] },
      },
    },
    properties: { type: 'object', additionalProperties: { type: 'string' } },
  },
  additionalProperties: false,
}
