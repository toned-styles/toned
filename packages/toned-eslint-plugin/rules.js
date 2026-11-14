import {
  createAnalysis,
  declarations,
  inRender,
  optionsSchema,
  propertyName,
  returnedObjects,
  sameBag,
  unwrap,
} from './analysis.js'

const definition = (description, messages, extra = {}) => ({
  type: 'problem',
  docs: { description },
  schema: [optionsSchema],
  messages,
  ...extra,
})
const PLATFORM_ALIAS = /^@platform\.([A-Za-z][\w-]*)$/

/** A key as the cascade sees it: both platform spellings are one block. */
const canonicalKey = (name) => {
  const alias = PLATFORM_ALIAS.exec(name)
  return alias ? `@platform ${alias[1]}` : name
}

/** Keys whose value a later write REPLACES rather than merges with. */
const isShadowable = (name) =>
  name === '$style' ||
  name.startsWith('@') ||
  name.startsWith(':') ||
  name.includes(':') ||
  name.includes('~')

/** The object literal a spread argument names in this file, if any. */
function spreadObject(argument, source) {
  let node = unwrap(argument)
  for (let depth = 0; node?.type === 'Identifier' && depth < 8; depth++) {
    let found
    for (
      let scope = source.getScope(node);
      scope && !found;
      scope = scope.upper
    )
      found = scope.set.get(node.name)
    const def = found?.defs[0]
    if (
      def?.type !== 'Variable' ||
      def.node?.parent?.kind !== 'const' ||
      def.node.id.type !== 'Identifier'
    )
      return null
    node = unwrap(def.node.init)
  }
  return node?.type === 'ObjectExpression' ? node : null
}

const BRIDGE_PARAMETER = /^--toned-b-([a-z0-9]+)-([a-z0-9-]+)$/
const camel = (kebab) =>
  kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

/**
 * `--toned-b-scrollbar-background-color` → `['scrollbar', 'backgroundColor']`.
 * Bridge names are taken to be one word, as the declared ones are; a wrong
 * split is a compile error naming the declared bridges, never a silent one.
 */
const bridgeParameter = (name) => {
  const match = name && BRIDGE_PARAMETER.exec(name)
  return match ? [camel(match[1]), camel(match[2])] : null
}

/** `{ placeholder: { color: 'red' } }` from `[bridge, property, valueText]`. */
const bridgeObject = (entries) => {
  const byBridge = new Map()
  for (const [bridge, property, value] of entries) {
    if (!byBridge.has(bridge)) byBridge.set(bridge, [])
    byBridge.get(bridge).push(`${property}: ${value}`)
  }
  return `{ ${[...byBridge]
    .map(([bridge, props]) => `${bridge}: { ${props.join(', ')} }`)
    .join(', ')} }`
}

/** A string literal for an object key, in the quote style the file uses. */
const quoted = (text, quote = "'") =>
  `${quote}${text.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`)}${quote}`

/**
 * The string key a `q` builder call is equivalent to, or null when strings
 * cannot express it (a computed `dp()` step, a relation, a variant operand,
 * a non-literal argument, or a mix the `@` algebra has no form for).
 *
 * Forms: `{ kind: 'media', text }` (an `@` expression without the `@`),
 * `{ kind: 'state', text }` (`:a` or the compound `:a:b`),
 * `{ kind: 'key', text }` (a complete key: `'@platform web'`, `'Part:state'`)
 * and `{ kind: 'nested', outer, inner }` (`'@md': { ':hover': … }`).
 */
function conditionForm(node, analysis) {
  node = unwrap(node)
  if (node?.type !== 'CallExpression') return null
  const callee = unwrap(node.callee)
  if (callee?.type !== 'MemberExpression') return null
  const method = analysis.resolve(callee)
  if (method?.kind !== 'query-method') return null
  const name = propertyName(callee)
  const literal = (arg) => {
    const value = unwrap(arg)
    return value?.type === 'Literal' &&
      typeof value.value === 'string' &&
      /^[A-Za-z_][\w-]*$/.test(value.value)
      ? value.value
      : null
  }
  const args = node.arguments.map(literal)
  const allLiteral = (count) =>
    node.arguments.length === count && args.every((arg) => arg !== null)
  const owner = analysis.resolve(callee.object)
  if (owner?.kind === 'query-part') {
    // q.part(name).state(state); `.has(...)` is a relation and stays.
    const part = unwrap(callee.object)
    const partName =
      part?.type === 'CallExpression' && part.arguments.length === 1
        ? literal(part.arguments[0])
        : null
    return name === 'state' && partName && allLiteral(1)
      ? { kind: 'key', text: `${partName}:${args[0]}` }
      : null
  }
  if (name === 'state')
    return allLiteral(1) ? { kind: 'state', text: `:${args[0]}` } : null
  if (name === 'media')
    return allLiteral(1) ? { kind: 'media', text: args[0] } : null
  if (name === 'container')
    return allLiteral(2)
      ? { kind: 'media', text: `${args[0]}/${args[1]}` }
      : null
  if (name === 'platform')
    return allLiteral(1) ? { kind: 'key', text: `@platform ${args[0]}` } : null
  const operands = node.arguments.map((arg) => conditionForm(arg, analysis))
  if (!operands.length || operands.some((operand) => !operand)) return null
  const atom = (form) => form.kind === 'media' && !/[&|]/.test(form.text)
  if (name === 'not')
    return operands.length === 1 &&
      atom(operands[0]) &&
      !operands[0].text.startsWith('!')
      ? { kind: 'media', text: `!${operands[0].text}` }
      : null
  if (name === 'any')
    return operands.every(atom)
      ? { kind: 'media', text: operands.map((o) => o.text).join('|') }
      : null
  if (name === 'all') {
    const media = operands.filter((o) => o.kind === 'media')
    const states = operands.filter((o) => o.kind === 'state')
    if (
      media.length + states.length !== operands.length ||
      media.some((o) => o.text.includes('|'))
    )
      return null
    const outer = media.map((o) => o.text).join('&')
    const inner = states.map((o) => o.text).join('')
    if (!inner) return { kind: 'media', text: outer }
    if (!outer) return { kind: 'state', text: inner }
    return { kind: 'nested', outer: `@${outer}`, inner }
  }
  return null
}

/** The object key a form is written as (the outer key of a nested one). */
const formKey = (form) =>
  form.kind === 'media'
    ? `@${form.text}`
    : form.kind === 'nested'
      ? form.outer
      : form.text

/** `'@media md'` → `'@md'`, `'@container field wide'` → `'@field/wide'`. */
function literalConditionAlias(name) {
  const media = /^@media\s+([A-Za-z_][\w-]*)$/.exec(name)
  if (media) return `@${media[1]}`
  const container = /^@container\s+([A-Za-z_][\w-]*)\s+([A-Za-z_][\w-]*)$/.exec(
    name,
  )
  if (container) return `@${container[1]}/${container[2]}`
  return null
}

/** Whether `node` sits in a toned stylesheet, `extend` or `variants` call. */
function inDeclarationCall(node, analysis) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type !== 'CallExpression') continue
    const callee = analysis.resolve(parent.callee)
    if (
      (callee?.kind === 'api' && callee.name === 'stylesheet') ||
      (callee?.kind === 'sheet-method' &&
        ['extend', 'variants'].includes(callee.name))
    )
      return true
  }
  return false
}

const options = (context, input) => {
  const defaults = typeof input === 'function' ? input(context) : input
  return {
    ...defaults,
    ...context.options[0],
    modules: { ...defaults.modules, ...context.options[0]?.modules },
  }
}

export function createRules(defaults = {}) {
  return {
    'no-create-elements-in-render': {
      meta: definition(
        'Keep Toned component families stable across React renders.',
        {
          unstable:
            'createElements creates new component identities here and can remount children. Declare the family at module scope; pass changing variants through its provider. Do not hoist captured values blindly.',
        },
      ),
      create(context) {
        const analysis = createAnalysis(context, options(context, defaults))
        return {
          CallExpression(node) {
            const callee = analysis.resolve(node.callee)
            if (
              callee?.kind === 'api' &&
              callee.name === 'createElements' &&
              inRender(node, analysis)
            )
              context.report({ node, messageId: 'unstable' })
          },
        }
      },
    },
    'no-partial-host-bag': {
      meta: definition(
        'Preserve refs and interaction props when applying useStyles to a host.',
        {
          partial:
            'This host receives only a field from a Toned part bag, losing its ref and interaction props. Spread the complete bag or use part.withProps({...}); reading .style remains valid for non-host APIs.',
        },
      ),
      create(context) {
        const analysis = createAnalysis(context, options(context, defaults))
        return {
          JSXOpeningElement(node) {
            const name = node.name
            const native = analysis.resolve(name)
            const host =
              (name.type === 'JSXIdentifier' && /^[a-z]/.test(name.name)) ||
              native?.name === 'host'
            if (!host) return
            for (const attribute of node.attributes) {
              if (
                attribute.type !== 'JSXAttribute' ||
                !['style', 'className', 'ref'].includes(attribute.name?.name) ||
                attribute.value?.type !== 'JSXExpressionContainer'
              )
                continue
              const field = analysis.resolve(attribute.value.expression)
              if (field?.kind !== 'bag-field') continue
              const complete = node.attributes.some(
                (a) =>
                  a.type === 'JSXSpreadAttribute' &&
                  sameBag(analysis.resolve(a.argument), field.bag),
              )
              if (!complete)
                context.report({ node: attribute, messageId: 'partial' })
            }
          },
        }
      },
    },
    'no-global-config': {
      meta: definition(
        'Keep application Toned configuration inside an explicit renderer/provider.',
        {
          global:
            'setConfig changes process-global Toned state. Use an explicit renderer with TonedProvider (or the application provider), and createTokenStyles for pure token snapshots. Upstream compatibility code may opt out.',
        },
      ),
      create(context) {
        const analysis = createAnalysis(context, options(context, defaults))
        return {
          CallExpression(node) {
            const callee = analysis.resolve(node.callee)
            if (callee?.kind === 'api' && callee.name === 'setConfig')
              context.report({ node, messageId: 'global' })
          },
        }
      },
    },
    'prefer-canonical-declarations': {
      meta: definition(
        'Use explicit Toned declaration metadata and the annotated variant callback.',
        {
          key: 'Use {{canonical}} for this Toned declaration field. Legacy {{legacy}} remains compatible; token payloads and host style objects are not declaration metadata.',
          variants:
            'Prefer .variants(($: Variants<Mods>) => ({ ... })) so the returned rules retain inference and validation. Keep reusable modifier types; do not replace them with a runtime schema.',
        },
        { type: 'suggestion', fixable: 'code' },
      ),
      create(context) {
        const analysis = createAnalysis(context, options(context, defaults))
        const reported = new WeakSet()
        return {
          CallExpression(node) {
            const callee = analysis.resolve(node.callee)
            if (
              callee?.kind === 'sheet-method' &&
              callee.name === 'variants' &&
              (node.typeArguments?.params?.length ||
                node.typeParameters?.params?.length)
            )
              context.report({ node: node.callee, messageId: 'variants' })
            declarations(node, analysis, (property, object) => {
              const name = propertyName(property),
                canonical =
                  name === 'style'
                    ? '$style'
                    : name === '$$type'
                      ? '$kind'
                      : null
              if (!canonical || reported.has(property)) return
              reported.add(property)
              const collision = object.properties.some(
                (other) =>
                  other !== property &&
                  [name, canonical].includes(propertyName(other)),
              )
              // An unknown spread could supply the canonical field; changing order/merge
              // behavior is not an autofix. The diagnostic remains useful.
              const spread = object.properties.some(
                (other) => other.type === 'SpreadElement',
              )
              context.report({
                node: property.key,
                messageId: 'key',
                data: { canonical, legacy: name },
                ...(!collision &&
                !spread &&
                !property.computed &&
                !property.shorthand
                  ? {
                      fix: (fixer) =>
                        fixer.replaceText(property.key, canonical),
                    }
                  : {}),
              })
            })
          },
        }
      },
    },
    'prefer-bridge-key': {
      meta: definition(
        'Write bridge parameters with $bridge, not raw --toned-b-* custom properties.',
        {
          raw: "'{{name}}' is a bridge parameter written by hand: write $bridge: { {{bridge}}: { {{property}}: … } } beside $style. Core writes the variable, and the compiler checks the bridge and property against the system's declared bridges.{{manual}}",
        },
        { fixable: 'code' },
      ),
      create(context) {
        const source = context.sourceCode ?? context.getSourceCode()
        return {
          Property(property) {
            const key = propertyName(property)
            if (key !== '$style' && key !== 'style') return
            const parent = property.parent
            if (parent?.type !== 'ObjectExpression') return
            const value = unwrap(property.value)
            const objects =
              value?.type === 'ObjectExpression'
                ? [value]
                : value?.type === 'ArrayExpression'
                  ? value.elements
                      .map(unwrap)
                      .filter((e) => e?.type === 'ObjectExpression')
                  : []
            const list = value?.type === 'ArrayExpression'
            for (const object of objects) {
              const raw = object.properties.filter(
                (p) =>
                  p.type === 'Property' && bridgeParameter(propertyName(p)),
              )
              if (!raw.length) continue
              const existing = parent.properties.some(
                (p) => p.type === 'Property' && propertyName(p) === '$bridge',
              )
              const spread = object.properties.some(
                (p) => p.type === 'SpreadElement',
              )
              const fixable =
                !list && !existing && !spread && !property.computed
              const manual = fixable
                ? ''
                : existing
                  ? ' Merge it into the $bridge already written here.'
                  : ' Move it by hand.'
              // One report per style object, so a fix that moves every raw
              // key at once leaves nothing behind.
              const [bridge, prop] = bridgeParameter(propertyName(raw[0]))
              context.report({
                node: raw[0].key,
                messageId: 'raw',
                data: {
                  name: raw.map((p) => propertyName(p)).join("', '"),
                  bridge,
                  property: prop,
                  manual,
                },
                ...(fixable
                  ? {
                      fix: (fixer) => {
                        const kept = object.properties.filter(
                          (other) => !raw.includes(other),
                        )
                        const bridgeText = `$bridge: ${bridgeObject(
                          raw.map((r) => [
                            ...bridgeParameter(propertyName(r)),
                            source.getText(r.value),
                          ]),
                        )}`
                        const styleText = kept.length
                          ? `${source.getText(property.key)}: { ${kept
                              .map((k) => source.getText(k))
                              .join(', ')} }, `
                          : ''
                        return fixer.replaceText(
                          property,
                          `${styleText}${bridgeText}`,
                        )
                      },
                    }
                  : {}),
              })
            }
          },
        }
      },
    },
    'canonical-condition-key': {
      meta: definition(
        'Write conditions as string keys; keep q builders for what a string cannot express.',
        {
          builder:
            'Write {{key}} instead of this q builder: string keys are the canonical spelling of a condition, and the compiler checks them the same way. Keep q for what a string cannot express (q.container(name, dp(n)), q.part(…).has(…)).{{manual}}',
          alias: "'{{alias}}' is an alias: write '{{canonical}}'.{{manual}}",
        },
        { fixable: 'code' },
      ),
      create(context) {
        const analysis = createAnalysis(context, options(context, defaults))
        const source = analysis.source
        const siblingHas = (property, key) =>
          property.parent?.properties?.some(
            (other) =>
              other !== property &&
              other.type === 'Property' &&
              !other.computed &&
              propertyName(other) === key,
          )
        const quoteOf = (property) => {
          for (const other of property.parent?.properties ?? []) {
            const key = other.type === 'Property' ? other.key : null
            if (key?.type === 'Literal' && typeof key.raw === 'string')
              return key.raw[0]
          }
          return "'"
        }
        return {
          Property(property) {
            if (property.kind !== 'init' || property.method) return
            if (property.computed) {
              // Only in a stylesheet's declarations: other consumers of
              // query keys (defineMotion's states) have no compound string.
              const form = conditionForm(property.key, analysis)
              if (!form || !inDeclarationCall(property, analysis)) return
              const key = formKey(form)
              const quote = quoteOf(property)
              const duplicate = siblingHas(property, key)
              const shown =
                form.kind === 'nested'
                  ? `${quoted(form.outer)}: { ${quoted(form.inner)}: … }`
                  : quoted(key)
              context.report({
                node: property.key,
                messageId: 'builder',
                data: {
                  key: shown,
                  manual: duplicate
                    ? ` This part already has a ${quoted(key)} block, so merge them by hand.`
                    : '',
                },
                ...(duplicate
                  ? {}
                  : {
                      fix: (fixer) =>
                        form.kind === 'nested'
                          ? fixer.replaceText(
                              property,
                              `${quoted(form.outer, quote)}: { ${quoted(form.inner, quote)}: ${source.getText(property.value)} }`,
                            )
                          : fixer.replaceTextRange(
                              [
                                source.getTokenBefore(property.key).range[0],
                                source.getTokenAfter(property.key).range[1],
                              ],
                              quoted(key, quote),
                            ),
                    }),
              })
              return
            }
            const name = propertyName(property)
            const canonical = name && literalConditionAlias(name)
            if (!canonical || !inDeclarationCall(property, analysis)) return
            const duplicate = siblingHas(property, canonical)
            const keyNode = property.key
            const quote =
              keyNode.type === 'Literal' && typeof keyNode.raw === 'string'
                ? keyNode.raw[0]
                : "'"
            context.report({
              node: keyNode,
              messageId: 'alias',
              data: {
                alias: name,
                canonical,
                manual: duplicate
                  ? ` This part already has a '${canonical}' block, so merge them by hand.`
                  : '',
              },
              ...(duplicate
                ? {}
                : {
                    fix: (fixer) =>
                      fixer.replaceText(keyNode, quoted(canonical, quote)),
                  }),
            })
          },
        }
      },
    },
    'canonical-platform-key': {
      meta: definition(
        "Write platform blocks as '@platform web', the one canonical spelling.",
        {
          alias:
            "'{{alias}}' is a deprecated alias: write '{{canonical}}'. The two spellings are one block, so this rule fixes the key.",
          both: "'{{canonical}}' and its alias '{{alias}}' are both written here, and one block replaces the other: merge them into one '{{canonical}}' block.",
        },
        { fixable: 'code' },
      ),
      create(context) {
        return {
          Property(property) {
            const name = propertyName(property)
            const alias =
              name && !property.computed && PLATFORM_ALIAS.exec(name)
            if (!alias) return
            const canonical = `@platform ${alias[1]}`
            const both = property.parent?.properties?.some(
              (other) =>
                other !== property && propertyName(other) === canonical,
            )
            const key = property.key
            const quote =
              key.type === 'Literal' && typeof key.raw === 'string'
                ? key.raw[0]
                : "'"
            context.report({
              node: key,
              messageId: both ? 'both' : 'alias',
              data: { alias: name, canonical },
              ...(both
                ? {}
                : {
                    fix: (fixer) =>
                      fixer.replaceText(key, `${quote}${canonical}${quote}`),
                  }),
            })
          },
        }
      },
    },
    'no-web-rules': {
      meta: definition(
        'Report the deprecated $webRules extension, whose CSS comes from sheet content.',
        {
          deprecated:
            "$webRules is deprecated: it generates CSS from sheet content, so the build has to read the sheet. Use a declared state (conditions.states, written ':disabled') for a DOM or ARIA fact, a declared bridge (conditions.bridges, a token writing bridgeVarName) for a pseudo-element such as ::placeholder, a registered-part relation (q.part('Item').has(…)) for a structural selector, or $bridge where it is available.",
        },
      ),
      create(context) {
        return {
          Property(property) {
            if (propertyName(property) !== '$webRules') return
            context.report({ node: property.key, messageId: 'deprecated' })
          },
        }
      },
    },
    'no-shadowing-spread': {
      meta: definition(
        'Compose style fragments with a $style list, not object spreads that replace each other.',
        {
          shadowed:
            "This spreads '{{key}}', which {{by}} also sets, so one replaces the other instead of merging. Compose the fragments with a list: $style: [a, b, { … }] (inside the '{{key}}' block when it is a platform or condition block).",
        },
      ),
      create(context) {
        const analysis = createAnalysis(context, options(context, defaults))
        const source = analysis.source
        const ownKeys = (object) => {
          const keys = new Set()
          for (const property of object?.properties ?? [])
            if (property.type === 'Property') {
              const name = propertyName(property)
              if (name) keys.add(canonicalKey(name))
            }
          return keys
        }
        const label = (node) =>
          source.getText(node).length <= 40
            ? `...${source.getText(node)}`
            : 'a later spread'
        const check = (object) => {
          const entries = object.properties
          entries.forEach((entry, index) => {
            if (entry.type !== 'SpreadElement') return
            const spread = spreadObject(entry.argument, source)
            if (!spread) return
            for (const key of ownKeys(spread)) {
              if (!isShadowable(key)) continue
              const by = entries.find(
                (other, at) =>
                  at !== index &&
                  (other.type === 'Property'
                    ? canonicalKey(propertyName(other) ?? '') === key
                    : at > index &&
                      ownKeys(spreadObject(other.argument, source)).has(key)),
              )
              if (!by) continue
              context.report({
                node: entry,
                messageId: 'shadowed',
                data: {
                  key,
                  by: by.type === 'Property' ? 'the part' : label(by.argument),
                },
              })
              return
            }
          })
        }
        // Every declaration object of a stylesheet (parts, conditions and
        // platform blocks), never a $-value such as $style or $webRules.
        const walk = (object, depth) => {
          if (depth > 32) return
          check(object)
          for (const property of object.properties) {
            if (property.type !== 'Property') continue
            const name = propertyName(property)
            if (name?.startsWith('$')) continue
            const value = unwrap(property.value)
            if (value?.type === 'ObjectExpression') walk(value, depth + 1)
          }
        }
        return {
          CallExpression(node) {
            const callee = analysis.resolve(node.callee)
            const inputs =
              callee?.kind === 'api' && callee.name === 'stylesheet'
                ? [node.arguments[0]]
                : callee?.kind === 'sheet-method' &&
                    ['extend', 'variants'].includes(callee.name)
                  ? node.arguments
                  : []
            for (const object of inputs.flatMap(returnedObjects))
              walk(object, 0)
          },
        }
      },
    },
    'prefer-semantic-tokens': {
      meta: definition(
        'Suggest configured semantic tokens for static raw style values.',
        {
          semantic:
            'Consider {{token}} instead of static $style.{{property}} so the design intent is shared with the system. Keep $style when no semantic token expresses this value; this suggestion does not establish visual equivalence.',
        },
        { type: 'suggestion' },
      ),
      create(context) {
        const config = options(context, defaults)
        const analysis = createAnalysis(context, config)
        const reported = new WeakSet()
        return {
          CallExpression(node) {
            declarations(node, analysis, (property) => {
              if (!['$style', 'style'].includes(propertyName(property))) return
              const object = unwrap(property.value)
              if (object?.type !== 'ObjectExpression') return
              for (const raw of object.properties) {
                if (raw.type !== 'Property' || reported.has(raw)) continue
                const name = propertyName(raw),
                  token = config.properties?.[name]
                const value = unwrap(raw.value)
                if (
                  !token ||
                  value?.type !== 'Literal' ||
                  !['string', 'number'].includes(typeof value.value)
                )
                  continue
                // Theme references, inherited paint and zero geometry already have clear
                // intent; measured expressions and native transform objects stay untouched.
                if (
                  value.value === 0 ||
                  (typeof value.value === 'string' &&
                    /^(?:var\(|inherit$|initial$|unset$|none$|transparent$|currentColor$)/.test(
                      value.value,
                    ))
                )
                  continue
                reported.add(raw)
                context.report({
                  node: raw,
                  messageId: 'semantic',
                  data: { token, property: name },
                })
              }
            })
          },
        }
      },
    },
  }
}
