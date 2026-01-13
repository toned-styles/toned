type StyleValue = string | number | number
type StyleObject = Record<string, StyleValue>
type StyleRules = Record<string, StyleObject>

interface NestedStyleRules {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic nested style structure
  [selector: string]: any
}

type ModValue = string

type PropertyMap = {
  [key: string]: {
    [value: string]: number
  }
}

type SchemeConfig = {
  [key: string]: Set<string>
}

type RulesList = {
  [key: string]: {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic rule structure
    rule: any
  }
}

// NOTE: might be generalised to any mod
type InteractionList = Record<string, Record<string, boolean>>

type Config = {
  scheme: SchemeConfig
  list: RulesList
}

const WILDCARD = '*' as const

type MatcherScheme = Record<string, Set<ModValue>>

type MatcherList = Record<string, { rule: StyleRules }>

export class StyleMatcher<Schema extends NestedStyleRules = NestedStyleRules> {
  propertyBits: PropertyMap = {}
  compiledRules: Array<{
    bitMask: number
    bitValue: number
    original: string
    // biome-ignore lint/suspicious/noExplicitAny: dynamic rule structure
    rule: any
  }> = []

  useAtPrefix: boolean

  scheme: MatcherScheme
  list: MatcherList
  interactions: InteractionList
  elementSet: Set<string>

  bits: Array<[string, PropertyMap[string]]>

  // biome-ignore lint/suspicious/noExplicitAny: cache stores dynamic style results
  cache = new Map<number, any>()

  constructor(rules: NestedStyleRules) {
    const { scheme, list, interactions, elementSet } = this.flattenRules(rules)

    this.elementSet = elementSet

    this.interactions = interactions

    this.scheme = scheme
    this.list = list

    this.useAtPrefix = false

    // console.dir(list, { depth: null })

    this.compile({ scheme, list })

    this.bits = Object.entries(this.propertyBits)
  }

  /**
   * Check if a key looks like an element name (not a selector)
   */
  private isElementKey(key: string): boolean {
    return (
      key[0] !== '[' &&
      key[0] !== '@' &&
      key[0] !== ':' &&
      key[0] !== '$' &&
      !key.includes(':') &&
      key !== 'prototype'
    )
  }

  /**
   * Check if a key is a cross-element selector like 'container:hover'
   */
  private isCrossElementSelector(key: string): boolean {
    return (
      key.includes(':') && key[0] !== '[' && key[0] !== '@' && key[0] !== ':'
    )
  }

  private flattenRules(rules: NestedStyleRules) {
    const elementSet = new Set<string>()
    const interactions: InteractionList = {}
    const list: MatcherList = {}
    const scheme: MatcherScheme = {}

    const modIndex = new Map<string, number>()

    type Selector = Map<string, string>

    // First pass: collect all element names
    for (const key in rules) {
      if (this.isElementKey(key)) {
        elementSet.add(key)
      } else if (this.isCrossElementSelector(key)) {
        // Extract element from cross-element selector like 'container:hover'
        const elementName = key.split(':')[0]
        if (elementName) elementSet.add(elementName)
        // Also add target elements from the element map
        const elementMap = rules[key]
        if (elementMap) {
          for (const targetKey in elementMap) {
            if (this.isElementKey(targetKey)) {
              elementSet.add(targetKey)
            }
          }
        }
      } else if (key[0] === '[') {
        // Variant selector - collect elements from element map
        const elementMap = rules[key]
        if (elementMap) {
          for (const targetKey in elementMap) {
            const actualKey = targetKey.replace(/^\$/, '')
            if (this.isElementKey(actualKey)) {
              elementSet.add(actualKey)
            }
          }
        }
      }
    }

    const traverseMod = (
      selector: Selector,
      mod: string,
      modValue: string,
      rule: StyleRules,
      propPrefix?: string,
    ) => {
      scheme[mod] ??= new Set()
      scheme[mod].add(modValue)

      const nextMap = new Map(selector)
      nextMap.set(mod, modValue)

      traverse(nextMap, rule, propPrefix)
    }

    /**
     * Process element rule, handling both $element and plain element references
     */
    const processElementRule = (elementKey: string, rule: NestedStyleRules) => {
      const currentRule: NestedStyleRules = {}

      for (const ruleKey in rule) {
        if (ruleKey[0] === '$') {
          // $element reference
          const targetElement = ruleKey.slice(1)
          currentRule[targetElement] = rule[ruleKey]
        } else if (elementSet.has(ruleKey)) {
          // Plain element reference (new API)
          currentRule[ruleKey] = rule[ruleKey]
        } else {
          // Style property - add to current element
          currentRule[elementKey] ??= {}
          currentRule[elementKey][ruleKey] = rule[ruleKey]
        }
      }

      return currentRule
    }

    const traverseElement = (
      selector: Map<string, string>,
      elementKey: string,
      elementRule: NestedStyleRules[string],
      propPrefix = '',
    ) => {
      const result: StyleObject = {}

      elementSet.add(elementKey)

      for (const key in elementRule) {
        if (key[0] === ':') {
          // Pseudo class (e.g., ':hover')
          const mod = `${elementKey}${key}`
          const modValue = 'true'

          interactions[elementKey] ??= {}
          interactions[elementKey][key] = true

          const currentRule = processElementRule(elementKey, elementRule[key])

          traverseMod(selector, mod, modValue, currentRule)
        } else if (key[0] === '[') {
          // Variant selector inside element
          const [mod, modValue] = this.parseSelector(key)

          const currentRule = processElementRule(elementKey, elementRule[key])

          traverseMod(selector, mod, modValue, currentRule)
        } else if (key[0] === '@') {
          // Breakpoint selector
          const [mod, modValue] = this.parseAtSelector(key)

          const currentRule = processElementRule(elementKey, elementRule[key])

          traverseMod(
            selector,
            mod,
            modValue,
            currentRule,
            this.useAtPrefix ? `${mod}_${modValue}_` : undefined,
          )
        } else {
          // Regular style property
          result[propPrefix + key] = elementRule[key]
        }
      }

      return result
    }

    const traverse = (
      selector: Map<string, string>,
      node: NestedStyleRules,
      propPrefix?: string,
    ) => {
      const selectorRule: NestedStyleRules = Object.create(null)

      for (const [key] of selector) {
        if (!modIndex.has(key)) {
          modIndex.set(key, modIndex.size)
        }
      }

      // Build listKey using modIndex order
      let listKey = ''
      let first = true
      for (const key of modIndex.keys()) {
        if (!first) listKey += '|'
        first = false
        listKey += `${key}=${selector.get(key) || WILDCARD}`
      }

      list[listKey] ??= { rule: selectorRule }
      Object.assign(list[listKey].rule, selectorRule)

      for (const key in node) {
        if (key[0] === '[') {
          // Variant selector like '[size=sm]' or '[disabled]'
          const mods = this.parseCombinedSelector(key)

          if (mods.length === 1 && mods[0]) {
            // Single selector
            const [mod, modValue] = mods[0]
            // Check if node[key] contains element references (new API)
            const nodeValue = node[key]
            const transformedRule: NestedStyleRules = {}

            for (const targetKey in nodeValue) {
              if (targetKey[0] === '$') {
                // Already in internal format
                transformedRule[targetKey.slice(1)] = nodeValue[targetKey]
              } else if (elementSet.has(targetKey)) {
                // New API: plain element reference
                transformedRule[targetKey] = nodeValue[targetKey]
              } else {
                // Style property (shouldn't happen at root variant level)
                transformedRule[targetKey] = nodeValue[targetKey]
              }
            }

            traverseMod(selector, mod, modValue, transformedRule)
          } else {
            // Combined selector - apply all mods at once
            const currentSelector = new Map(selector)
            for (const [mod, modValue] of mods) {
              scheme[mod] ??= new Set()
              scheme[mod].add(modValue)
              currentSelector.set(mod, modValue)

              if (!modIndex.has(mod)) {
                modIndex.set(mod, modIndex.size)
              }
            }

            // Transform element references
            const nodeValue = node[key]
            const transformedRule: NestedStyleRules = {}

            for (const targetKey in nodeValue) {
              if (targetKey[0] === '$') {
                transformedRule[targetKey.slice(1)] = nodeValue[targetKey]
              } else if (elementSet.has(targetKey)) {
                transformedRule[targetKey] = nodeValue[targetKey]
              } else {
                transformedRule[targetKey] = nodeValue[targetKey]
              }
            }

            traverse(currentSelector, transformedRule, propPrefix)
          }
        } else if (key[0] === '@') {
          const [mod, modValue] = this.parseAtSelector(key)

          traverseMod(selector, mod, modValue, node[key])
        } else if (this.isCrossElementSelector(key)) {
          // Cross-element selector like 'container:hover'
          const parts = key.split(':')
          const elementName = parts[0]
          if (!elementName) return
          const pseudoClasses = parts.slice(1).map((p) => `:${p}`)

          if (!elementSet.has(elementName)) return

          const elementMap = node[key]
          if (!elementMap) return

          // Register interactions
          interactions[elementName] ??= {}
          for (const pseudo of pseudoClasses) {
            interactions[elementName][pseudo] = true
          }

          // Build the modifier chain
          const crossSelector = new Map(selector)
          for (const pseudo of pseudoClasses) {
            const mod = `${elementName}${pseudo}`
            const modValue = 'true'
            scheme[mod] ??= new Set()
            scheme[mod].add(modValue)
            crossSelector.set(mod, modValue)

            if (!modIndex.has(mod)) {
              modIndex.set(mod, modIndex.size)
            }
          }

          // Process target elements
          const transformedRule: NestedStyleRules = {}
          for (const targetKey in elementMap) {
            if (targetKey[0] === '$') {
              transformedRule[targetKey.slice(1)] = elementMap[targetKey]
            } else if (elementSet.has(targetKey)) {
              transformedRule[targetKey] = elementMap[targetKey]
            }
          }

          traverse(crossSelector, transformedRule, propPrefix)
        } else {
          // Element definition
          const elementKey = key.replace(/^\$/, '')
          const elementRule = traverseElement(
            selector,
            elementKey,
            node[key],
            propPrefix,
          )
          selectorRule[elementKey] = elementRule
        }
      }
    }

    traverse(new Map(), rules)

    return { scheme, list, interactions, elementSet }
  }

  private parseSelector(selector: string): [string, string] {
    const inner = selector.slice(1, -1)
    // Check if it's a boolean variant (no '=' sign)
    if (!inner.includes('=')) {
      return [inner, 'true']
    }
    const parts = inner.split('=')
    const name = parts[0] || inner
    const value = parts[1] ?? '*'
    return [name, value]
  }

  /**
   * Parse combined selectors like '[size=sm][variant=accent]' or '[disabled][size=sm]'
   * Returns array of [mod, value] pairs
   * Supports both key=value and boolean (key only) formats
   */
  private parseCombinedSelector(selector: string): Array<[string, string]> {
    const results: Array<[string, string]> = []
    // Match both [key=value] and [key] (boolean) formats
    const regex = /\[([^\]=\]]+)(?:=([^\]]+))?\]/g
    let match = regex.exec(selector)

    while (match !== null) {
      const key = match[1]
      if (key) {
        const value = match[2] ?? 'true' // Boolean variant if no value
        results.push([key, value])
      }
      match = regex.exec(selector)
    }

    return results
  }

  private parseAtSelector(selector: string): [string, string] {
    return [selector, String(true)]
  }

  compile(config: Config) {
    // First, create a mapping of each property:value to a unique bit position
    let bitPosition = 0

    for (const property in config.scheme) {
      this.propertyBits[property] = {}
      const values = config.scheme[property]
      for (const value of values) {
        this.propertyBits[property][value] = 1 << bitPosition
        bitPosition++
      }
    }

    // Then compile each rule into its bitmask
    for (const ruleStr in config.list) {
      const ruleData = config.list[ruleStr]
      if (ruleStr === '') continue // Skip empty rule

      let bitMask = 0
      let bitValue = 0

      const conditions = ruleStr.split('|')
      for (const condition of conditions) {
        const [property, value = '*'] = condition.split('=')

        if (value === WILDCARD) continue

        // Skip unknown properties - this handles dynamic or undefined variant values gracefully
        if (
          !(
            property &&
            this.propertyBits[property] &&
            this.propertyBits[property][value] !== undefined
          )
        )
          continue

        const propertyBitValue = this.propertyBits[property][value]

        bitMask |= this.getMask(this.propertyBits[property])
        bitValue |= propertyBitValue
      }

      this.compiledRules.push({
        bitMask,
        bitValue,
        original: ruleStr,
        rule: ruleData.rule,
      })
    }
  }

  private getMask(valuesMap: PropertyMap[string]): number {
    let mask = 0
    for (const key in valuesMap) {
      mask |= valuesMap[key]
    }
    return mask
  }

  getPropsBits(props: Partial<Schema>) {
    let bits = 0
    const bitsLen = this.bits.length

    for (let i = 0; i < bitsLen; i++) {
      const entry = this.bits[i]
      const prop = entry[0]
      const values = entry[1]
      const value = props[prop]

      // Skip undefined values or unknown property values - allows partial state matching
      if (value === undefined || values[value] === undefined) continue

      bits |= values[value]
    }

    return bits
  }

  #elementHash = Symbol.for('@toned/core/StyleMatcher/elementHash')
  #propsBits = Symbol.for('@toned/core/StyleMatcher/propsBits')

  match(
    props: Partial<
      Schema &
        Record<`${string}:${string}`, boolean> &
        Record<`@${string}.${string}`, boolean>
    >,
  ) {
    const propsBits = this.getPropsBits(props)

    if (this.cache.has(propsBits)) {
      return this.cache.get(propsBits)
    }

    // Match against compiled rules
    // biome-ignore lint/suspicious/noExplicitAny: dynamic style result structure
    const result: Record<string | symbol, any> = {}

    for (const elementKey in this.list['']?.rule) {
      result[elementKey] ??= {}
      Object.assign(result[elementKey], this.list[''].rule[elementKey])
    }

    result[this.#elementHash] = {}
    result[this.#propsBits] = propsBits

    for (const compiledRule of this.compiledRules) {
      if ((propsBits & compiledRule.bitMask) !== compiledRule.bitValue) continue

      for (const elementKey in compiledRule.rule) {
        result[elementKey] ??= {}
        Object.assign(result[elementKey], compiledRule.rule[elementKey])

        result[this.#elementHash][elementKey] ^= compiledRule.bitValue
      }
    }

    this.cache.set(propsBits, result)

    return result
  }

  // biome-ignore lint/suspicious/noExplicitAny: style objects have dynamic structure with internal hash
  isEqual(elementKey: string, style1: any, style2: any) {
    return (
      style1?.[this.#elementHash]?.[elementKey] ===
      style2?.[this.#elementHash]?.[elementKey]
    )
  }
}
