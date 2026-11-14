import { describe, expect, test } from 'vitest'

import { defineToken } from '../system/definers.ts'
import { generate } from './generate.ts'

describe('generate', () => {
  test('alpha-capable atomics keep plain and color-mix browser fallbacks', () => {
    const result = generate({
      ink: defineToken({
        values: ['muted'] as const,
        resolve: () => ({ color: 'var(--muted)' }),
        alphaChannel: ['color'],
      }),
    })
    const plain = 'color:var(--muted);'
    const mix =
      'color:color-mix(in oklab, var(--muted) calc(var(--toned-alpha-color, 1) * 100%), transparent);'
    const relative =
      'color:rgb(from var(--muted) r g b / calc(alpha * var(--toned-alpha-color, 1)));'
    expect(result).toContain(`.ink_muted{${plain}${mix}${relative}}`)
    expect(result).toContain('.ink\\$50{--toned-alpha-color:0.5}')
    expect(result).toContain(
      "@property --toned-alpha-color {syntax:'<number>';inherits:false;initial-value:1;}",
    )
  })

  describe('sibling and focus-within channels', () => {
    test('the system css carries sibling-hover, focus-within and sibling-state toggles', () => {
      const result = generate({
        breakpoints: { __breakpoints: { sm: 480 } },
        states: {
          'data-active': { selector: '[data-active]', relations: ['sibling'] },
        },
      })
      expect(result).toContain('._s:hover ~ ._ {--toned_sib-hover: ;}')
      expect(result).toContain('._s:focus-within {--toned_src-focus-within: ;}')
      expect(result).toContain(
        '._s[data-active] ~ ._ {--toned_sib-data-active: ;}',
      )
      // focus-within joins the self pseudo toggles too
      expect(result).toContain('._:focus-within {--toned_focus-within: ;}')
    })

    test('a sibling toggle is kept off descendants by registration, not by a rule', () => {
      const result = generate({
        breakpoints: { __breakpoints: { sm: 480 } },
        states: {
          'data-active': { selector: '[data-active]', relations: ['sibling'] },
        },
      })
      // `._s… ~ ._ ._` asks every styled element, for every styled ancestor,
      // to scan that ancestor's previous siblings: quadratic in a long list.
      expect(result).not.toContain('~ ._ ._')
      expect(result).toContain(
        "@property --toned_sib-hover {syntax:'*';inherits:false;}",
      )
      expect(result).toContain(
        "@property --toned_sib-data-active {syntax:'*';inherits:false;}",
      )
    })
  })

  describe('responsive atomic classes', () => {
    const maxW = {
      values: ['gutter', '32'],
      resolve: (value: string) => ({
        maxWidth: value === 'gutter' ? 'calc(100% - 2rem)' : '32rem',
      }),
    }

    test('emits each opted token value again under every width breakpoint, ascending', () => {
      const result = generate({
        maxW,
        breakpoints: { __breakpoints: { md: 768, sm: 480 } },
        responsiveTokens: ['maxW'],
      })
      expect(result).toContain(
        '@media (min-width: 480px) {.\\@sm\\:maxW_gutter{max-width:calc(100% - 2rem);}.\\@sm\\:maxW_32{max-width:32rem;}}',
      )
      expect(result).toContain(
        '@media (min-width: 768px) {.\\@md\\:maxW_gutter',
      )
      // ascending order: the md classes come after the sm classes, and both
      // after the resting atomics, so an active breakpoint wins by order
      expect(result.indexOf('.maxW_gutter{')).toBeLessThan(
        result.indexOf('\\@sm\\:maxW_gutter'),
      )
      expect(result.indexOf('\\@sm\\:maxW_gutter')).toBeLessThan(
        result.indexOf('\\@md\\:maxW_gutter'),
      )
    })

    test('declared pairs emit only the conditions each token names', () => {
      const result = generate({
        maxW,
        breakpoints: {
          __breakpoints: {
            sm: 480,
            md: 768,
            lg: 1024,
            coarse: '(pointer: coarse)',
          },
        },
        responsiveTokens: { maxW: ['md'] },
      })
      expect(result).toContain(
        '@media (min-width: 768px) {.\\@md\\:maxW_gutter{max-width:calc(100% - 2rem);}.\\@md\\:maxW_32{max-width:32rem;}}',
      )
      expect(result).not.toContain('\\@sm\\:maxW')
      expect(result).not.toContain('\\@lg\\:maxW')
      expect(result).not.toContain('\\@coarse\\:maxW')
    })

    test('a token listed without conditions keeps every breakpoint (the legacy list)', () => {
      const result = generate({
        maxW,
        breakpoints: {
          __breakpoints: { sm: 480, coarse: '(pointer: coarse)' },
        },
        responsiveTokens: ['maxW'],
      })
      expect(result).toContain('\\@sm\\:maxW_32')
      expect(result).toContain('\\@coarse\\:maxW_32')
    })

    test('four equal sides collapse to one shorthand in a responsive atom', () => {
      const margin = {
        values: [1],
        resolve: () => ({
          marginLeft: '4px',
          marginTop: '4px',
          marginBottom: '4px',
          marginRight: '4px',
        }),
      }
      const uneven = {
        values: [1],
        resolve: () => ({
          paddingLeft: '4px',
          paddingTop: '2px',
          paddingBottom: '4px',
          paddingRight: '4px',
        }),
      }
      const result = generate({
        margin,
        uneven,
        breakpoints: { __breakpoints: { md: 768 } },
        responsiveTokens: { margin: ['md'], uneven: ['md'] },
      })
      expect(result).toContain('.\\@md\\:margin_1{margin:4px;}')
      expect(result).toContain(
        '.\\@md\\:uneven_1{padding-left:4px;padding-top:2px;padding-bottom:4px;padding-right:4px;}',
      )
    })

    test('a pair naming an undeclared token or condition is refused', () => {
      expect(() =>
        generate({
          maxW,
          breakpoints: { __breakpoints: { md: 768 } },
          responsiveTokens: { maxW: ['xl'] },
        }),
      ).toThrow(/responsiveTokens\.maxW names 'xl'.*'md'/)
      expect(() =>
        generate({
          maxW,
          breakpoints: { __breakpoints: { md: 768 } },
          responsiveTokens: { maxH: ['md'] },
        }),
      ).toThrow(/responsiveTokens names 'maxH'/)
    })

    test('un-opted tokens emit no responsive classes', () => {
      const result = generate({
        maxW,
        breakpoints: { __breakpoints: { sm: 480 } },
      })
      expect(result).not.toContain('\\@sm\\:maxW_gutter')
    })
  })

  describe('container-condition toggles', () => {
    test('emits per-element resets and @container flips for every step', () => {
      const result = generate({
        containers: { 'field-group': { md: '28rem' }, card: { sm: 80 } },
      })
      // The OFF init sits on `._` ITSELF, never html: the on-value is
      // valid-empty and inherits, so an html init would leak an outer
      // container's ON into an element whose own nearest same-name container
      // does not match.
      expect(result).toContain(
        '._ {--cq-field-group-md: initial;--cq-field-group-md-not: ;--cq-card-sm: initial;--cq-card-sm-not: ;}',
      )
      expect(result).toContain(
        '@container field-group (min-width: 28rem) { ._ { --cq-field-group-md: ; --cq-field-group-md-not: initial; } }',
      )
      expect(result).toContain(
        '@container card (min-width: 320px) { ._ { --cq-card-sm: ; --cq-card-sm-not: initial; } }',
      )
      // resets precede the flips, so the flip wins at equal specificity
      expect(result.indexOf('--cq-field-group-md: initial')).toBeLessThan(
        result.indexOf('@container field-group'),
      )
    })

    test('ad-hoc registered conditions get toggles too', () => {
      const result = generate(
        { containers: { card: { sm: 80 } } },
        { conditions: ['card/>=25rem', 'card/>=100'] },
      )
      expect(result).toContain(
        '@container card (min-width: 25rem) { ._ { --cq-card-gte25rem: ; --cq-card-gte25rem-not: initial; } }',
      )
      // 100 units × the default base (4px) = 400px
      expect(result).toContain(
        '@container card (min-width: 400px) { ._ { --cq-card-gte100: ; --cq-card-gte100-not: initial; } }',
      )
      expect(result).toContain(
        '--cq-card-gte100: initial;--cq-card-gte100-not: ;',
      )
    })

    test('a scoped system scopes both halves', () => {
      const result = generate(
        { containers: { card: { sm: 80 } } },
        { scope: '.ds2' },
      )
      expect(result).toContain(
        '.ds2 ._ {--cq-card-sm: initial;--cq-card-sm-not: ;}',
      )
      expect(result).toContain(
        '@container card (min-width: 320px) { .ds2 ._ { --cq-card-sm: ; --cq-card-sm-not: initial; } }',
      )
    })
  })

  describe('token class generation', () => {
    test('generates CSS class for a single token value', () => {
      const result = generate({
        bgColor: {
          values: ['primary'],
          resolve: (value: string) => ({
            backgroundColor: value === 'primary' ? '#007bff' : '#6c757d',
          }),
        },
      })

      expect(result).toContain('.bgColor_primary{background-color:#007bff;}')
    })

    test('generates CSS classes for multiple token values', () => {
      const result = generate({
        bgColor: {
          values: ['primary', 'secondary'],
          resolve: (value: string) => ({
            backgroundColor: value === 'primary' ? '#007bff' : '#6c757d',
          }),
        },
      })

      expect(result).toContain('.bgColor_primary{background-color:#007bff;}')
      expect(result).toContain('.bgColor_secondary{background-color:#6c757d;}')
    })

    test('generates CSS classes for multiple tokens', () => {
      const result = generate({
        bgColor: {
          values: ['primary'],
          resolve: (value: string) => ({
            backgroundColor: value === 'primary' ? '#007bff' : '#6c757d',
          }),
        },
        textColor: {
          values: ['white'],
          resolve: (value: string) => ({
            color: value === 'white' ? '#fff' : '#000',
          }),
        },
      })

      expect(result).toContain('.bgColor_primary{background-color:#007bff;}')
      expect(result).toContain('.textColor_white{color:#fff;}')
    })

    test('converts camelCase CSS properties to kebab-case', () => {
      const result = generate({
        fontSize: {
          values: ['large'],
          resolve: () => ({
            fontSize: '24px',
            lineHeight: '1.5',
          }),
        },
      })

      expect(result).toContain('font-size:24px;')
      expect(result).toContain('line-height:1.5;')
    })

    test('generates multiple CSS properties per class', () => {
      const result = generate({
        spacing: {
          values: ['md'],
          resolve: () => ({
            paddingTop: '8px',
            paddingBottom: '8px',
          }),
        },
      })

      expect(result).toContain(
        '.spacing_md{padding-top:8px;padding-bottom:8px;}',
      )
    })

    test('uses var(--prop) tokens proxy in resolve', () => {
      const result = generate({
        bgColor: {
          values: ['primary'],
          resolve: (_value: string, tokens: Record<string, string>) => ({
            backgroundColor: tokens['colorPrimary'],
          }),
        },
      })

      expect(result).toContain(
        '.bgColor_primary{background-color:var(--colorPrimary);}',
      )
    })
  })

  describe('media variable generation', () => {
    test('generates root rule with media variables set to initial', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { sm: 480 },
        },
      })

      expect(result).toContain('--media-sm: initial;')
    })

    test('generates @media rule for each breakpoint', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { sm: 480 },
        },
      })

      expect(result).toContain(
        '@media (min-width: 480px) { html { --media-sm: ; --media-sm-not: initial; } }',
      )
    })

    test('generates rules for multiple breakpoints', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { sm: 480, md: 768, lg: 1024 },
        },
      })

      expect(result).toContain('--media-sm: initial;')
      expect(result).toContain('--media-md: initial;')
      expect(result).toContain('--media-lg: initial;')
      expect(result).toContain(
        '@media (min-width: 480px) { html { --media-sm: ; --media-sm-not: initial; } }',
      )
      expect(result).toContain(
        '@media (min-width: 768px) { html { --media-md: ; --media-md-not: initial; } }',
      )
      expect(result).toContain(
        '@media (min-width: 1024px) { html { --media-lg: ; --media-lg-not: initial; } }',
      )
    })

    test('wraps root variables in html {} rule', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { sm: 480 },
        },
      })

      expect(result).toMatch(/html \{.*--media-sm: initial;.*\}/)
    })

    test('converts camelCase breakpoint keys to kebab-case', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { smallScreen: 480 },
        },
      })

      expect(result).toContain('--media-small-screen: initial;')
      expect(result).toContain(
        '@media (min-width: 480px) { html { --media-small-screen: ; --media-small-screen-not: initial; } }',
      )
    })
  })

  describe('pseudo-state variable generation', () => {
    test('generates hover, focus, and active CSS variables', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { sm: 480 },
        },
      })

      expect(result).toContain('--toned_hover: initial;')
      expect(result).toContain('--toned_focus: initial;')
      expect(result).toContain('--toned_active: initial;')
    })

    test('generates pseudo-state cascade rules', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { sm: 480 },
        },
      })

      for (const pseudo of ['hover', 'focus', 'active']) {
        const name = `--toned_${pseudo}`
        expect(result).toContain(`._:${pseudo} {${name}: ;}`)
        expect(result).toContain(`._:${pseudo} ._ {${name}: initial;}`)
        expect(result).toContain(`._:${pseudo} ._:${pseudo} {${name}: ;}`)
      }
    })

    test('pseudo-state variables are in the html root rule', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { sm: 480 },
        },
      })

      expect(result).toMatch(/html \{--toned_hover: initial;/)
    })
  })

  describe('declared states', () => {
    const rulesOf = (css: string, alias: string) =>
      css.split('}').filter((rule) => rule.includes(`--toned_${alias}`))

    test('a string state is self-scoped by registration and offers no relation channel', () => {
      const result = generate({ states: { open: "[data-state='open']" } })
      expect(result).toContain(
        "@property --toned_open {syntax:'*';inherits:false;}",
      )
      expect(result).toContain(
        "._[data-state='open'] {--toned_open: ;--toned_open-not: initial;}",
      )
      // No nested-reset rules: their rightmost `._` is every styled element.
      expect(result).not.toContain("._[data-state='open'] ._")
      expect(result).not.toContain('--toned_src-open')
      expect(result).not.toContain('--toned_sib-open')
      expect(result).not.toContain("._s[data-state='open']")
    })

    test('the ancestor relation emits the nearest-source channel', () => {
      const result = generate({
        states: {
          open: { selector: "[data-state='open']", relations: ['ancestor'] },
        },
      })
      expect(result).toContain('--toned_src-open: initial;')
      expect(result).toContain("._s[data-state='open'] {--toned_src-open: ;}")
      expect(result).toContain(
        "._s[data-state='open'] ._s {--toned_src-open: initial;}",
      )
      expect(result).toContain(
        "._s[data-state='open'] ._s[data-state='open'] {--toned_src-open: ;}",
      )
      expect(result).not.toContain('--toned_sib-open')
    })

    test('the sibling relation emits only the following-sibling channel', () => {
      const result = generate({
        states: {
          'data-active': { selector: '[data-active]', relations: ['sibling'] },
        },
      })
      expect(result).toContain(
        "@property --toned_sib-data-active {syntax:'*';inherits:false;}",
      )
      expect(result).toContain(
        '._s[data-active] ~ ._ {--toned_sib-data-active: ;}',
      )
      expect(result).not.toContain('--toned_src-data-active')
    })

    test('a :pseudo state selector attaches its source channel to ._s', () => {
      const result = generate({
        states: {
          disabled: { selector: ':disabled', relations: ['ancestor'] },
        },
      })
      expect(result).toContain('._s:disabled {--toned_src-disabled: ;}')
    })

    test('a state that needs hover is gated on devices that can hover', () => {
      const result = generate({
        states: {
          'row-hover': {
            selector: ':is([data-row]:hover)',
            relations: ['ancestor', 'sibling'],
          },
        },
      })
      for (const rule of [
        '._:is([data-row]:hover) {--toned_row-hover: ;--toned_row-hover-not: initial;}',
        '._s:is([data-row]:hover) {--toned_src-row-hover: ;}',
        '._s:is([data-row]:hover) ~ ._ {--toned_sib-row-hover: ;}',
      ]) {
        const at = result.indexOf(rule)
        expect(at).toBeGreaterThan(-1)
        expect(
          result.lastIndexOf('@media (hover: hover) {', at),
        ).toBeGreaterThan(result.lastIndexOf('}}', at))
      }
      // The resting complement is not a hover fact: it stays ungated.
      expect(result).toMatch(/\._ \{[^}]*--toned_row-hover-not: ;/)
    })

    test('a state that does not need hover stays ungated', () => {
      const result = generate({ states: { open: "[data-state='open']" } })
      expect(result).toContain(
        "@property --toned_open {syntax:'*';inherits:false;}._[data-state='open'] {",
      )
      expect(result).not.toContain(
        '@media (hover: hover) {@property --toned_open ',
      )
    })

    test('each further string state costs at most two rules', () => {
      const one = generate({ states: { a: '[data-a]' } })
      const two = generate({ states: { a: '[data-a]', b: '[data-b]' } })
      const count = (css: string) =>
        css.split('}').filter((r) => r.includes('{')).length
      expect(count(two) - count(one)).toBeLessThanOrEqual(2)
      expect(rulesOf(two, 'b').length).toBeLessThanOrEqual(3)
    })

    test('an unknown relation and a relation on a descendant selector are rejected', () => {
      expect(() =>
        generate({
          states: {
            // @ts-expect-error -- not a relation
            open: { selector: '[data-open]', relations: ['parent'] },
          },
        }),
      ).toThrow(/relation "parent".*ancestor.*sibling/)
      expect(() =>
        generate({
          states: { dark: { selector: '.dark', relations: ['ancestor'] } },
        }),
      ).toThrow(/dark.*attribute or pseudo-class selector/)
    })
  })

  describe('skips boxed primitives', () => {
    test('skips values that are boxed Number instances', () => {
      const result = generate({
        spacing: {
          values: ['sm', new Number(999) as any],
          resolve: (value: string | number) => ({
            padding: typeof value === 'number' ? `${value}px` : '4px',
          }),
        },
      })

      expect(result).toContain('.spacing_sm{padding:4px;}')
      expect(result).not.toContain('999')
    })

    test('skips values that are boxed String instances', () => {
      const result = generate({
        color: {
          values: ['red', new String('dynamic') as any],
          resolve: (value: string) => ({
            color: value,
          }),
        },
      })

      expect(result).toContain('.color_red{color:red;}')
      expect(result).not.toContain('dynamic')
    })

    test('generates classes for primitive number and string values', () => {
      const result = generate({
        spacing: {
          values: [4, 8],
          resolve: (value: number) => ({
            padding: `${value}px`,
          }),
        },
      })

      expect(result).toContain('.spacing_4{padding:4px;}')
      expect(result).toContain('.spacing_8{padding:8px;}')
    })
  })

  describe('handles empty system', () => {
    test('emits interaction infrastructure even without semantic tokens', () => {
      const result = generate({})

      expect(result).toContain('--toned_hover')
    })

    test('ignores invalid tokens but keeps interaction infrastructure', () => {
      const result = generate({
        notAToken: undefined,
      })

      expect(result).toContain('--toned_hover')
    })
  })

  describe('combined output', () => {
    test('produces breakpoint rules followed by token classes', () => {
      const result = generate({
        breakpoints: {
          __breakpoints: { sm: 480, md: 768 },
        },
        bgColor: {
          values: ['primary', 'secondary'],
          resolve: (value: string) => ({
            backgroundColor: value === 'primary' ? '#007bff' : '#6c757d',
          }),
        },
      })

      // Should contain breakpoint rules
      expect(result).toContain('html {')
      expect(result).toContain('--media-sm: initial;')
      expect(result).toContain('--media-md: initial;')
      expect(result).toContain('@media (min-width: 480px)')
      expect(result).toContain('@media (min-width: 768px)')

      // Should contain pseudo-state rules
      expect(result).toContain('--toned_hover: initial;')

      // Should contain token classes
      expect(result).toContain('.bgColor_primary{background-color:#007bff;}')
      expect(result).toContain('.bgColor_secondary{background-color:#6c757d;}')

      // Breakpoint rules should come before token classes
      const htmlIdx = result.indexOf('html {')
      const tokenIdx = result.indexOf('.bgColor_primary')
      expect(htmlIdx).toBeLessThan(tokenIdx)
    })

    test('skips resolve results that return falsy', () => {
      const result = generate({
        bgColor: {
          values: ['valid', 'invalid'],
          resolve: (value: string) => {
            if (value === 'invalid') return null
            return { backgroundColor: '#007bff' }
          },
        },
      })

      expect(result).toContain('.bgColor_valid{background-color:#007bff;}')
      expect(result).not.toContain('.bgColor_invalid')
    })

    test('skips entries without values property', () => {
      const result = generate({
        notAToken: { resolve: () => ({}) } as any,
        bgColor: {
          values: ['primary'],
          resolve: () => ({ backgroundColor: '#007bff' }),
        },
      })

      expect(result).toContain('.bgColor_primary{background-color:#007bff;}')
    })

    test('skips entries without resolve property', () => {
      const result = generate({
        notAToken: { values: ['a'] } as any,
        bgColor: {
          values: ['primary'],
          resolve: () => ({ backgroundColor: '#007bff' }),
        },
      })

      expect(result).toContain('.bgColor_primary{background-color:#007bff;}')
    })

    test('scope prefixes token classes, alpha steps and state toggles, but not html inits', () => {
      const result = generate(
        {
          states: { open: "[data-state='open']" },
          bgColor: {
            values: ['primary'],
            resolve: () => ({ backgroundColor: 'var(--primary)' }),
            alphaChannel: ['backgroundColor'],
          },
        } as any,
        { scope: '.my-ds' },
      )

      expect(result).toContain('.my-ds .bgColor_primary{')
      expect(result).toContain('.my-ds .bgColor\\$50{')
      expect(result).toContain(
        ".my-ds ._[data-state='open'] {--toned_open: ;--toned_open-not: initial;}",
      )
      // Custom-property inits and @property registrations stay global —
      // idempotent between systems, and a scoped @property is not a thing.
      expect(result).toContain(
        "@property --toned_open {syntax:'*';inherits:false;}",
      )
      expect(result).toContain('html {--toned_hover: initial;')
      expect(result).toContain('@property --toned-alpha-background-color')
      expect(result).not.toContain('.my-ds html')
    })
  })
})

describe('token pseudoRules — the vendor pseudo-element channel', () => {
  test('emits the pseudo rule against the value class, beside the inline rule', () => {
    const system = {
      scrollbar: defineToken({
        values: ['none'] as const,
        resolve: () => ({ scrollbarWidth: 'none' }),
        pseudoRules: () => ({ '::-webkit-scrollbar': { display: 'none' } }),
      }),
    }
    const css = generate(system as never)
    expect(css).toContain('.scrollbar_none{scrollbar-width:none;}')
    expect(css).toContain('.scrollbar_none::-webkit-scrollbar{display:none;}')
  })
})

describe('condition breakpoints — parenthesised values are raw media conditions', () => {
  test('emits the toggle under the condition, not min-width', () => {
    const css = generate({
      breakpoints: {
        __breakpoints: { sm: 480, pointerCoarse: '(pointer: coarse)' },
      },
    } as never)
    expect(css).toContain(
      '@media (pointer: coarse) { html { --media-pointer-coarse: ; --media-pointer-coarse-not: initial; } }',
    )
    expect(css).toContain(
      '@media (min-width: 480px) { html { --media-sm: ; --media-sm-not: initial; } }',
    )
  })
})

describe('main CSS numeric emission regressions', () => {
  test('serializes lengths, unitless values and custom parameters independently', () => {
    const css = generate({
      probe: {
        values: ['on'],
        resolve: () => ({
          padding: 8,
          fontWeight: 700,
          opacity: 0.5,
          '--gap': 8,
        }),
      },
    })
    expect(css).toContain('padding:8px')
    expect(css).toContain('font-weight:700')
    expect(css).toContain('opacity:0.5')
    expect(css).toContain('--gap:8')
  })
})
