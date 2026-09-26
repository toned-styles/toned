import {
  createAnalysis,
  declarations,
  inRender,
  optionsSchema,
  propertyName,
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
