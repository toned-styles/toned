import { describe, expect, test } from 'vitest'
import { defineToken } from '../system/definers.ts'
import { generate } from './generate.ts'

describe('generate', () => {
  describe('sibling and focus-within channels', () => {
    test('the system css carries sibling-hover, focus-within and sibling-state toggles', () => {
      const result = generate({
        breakpoints: { __breakpoints: { sm: 480 } },
        states: { 'data-active': '[data-active]' },
      })
      expect(result).toContain('._s:hover ~ ._ {--toned_sib-hover: ;}')
      expect(result).toContain('._s:focus-within {--toned_src-focus-within: ;}')
      expect(result).toContain("._s[data-active] ~ ._ {--toned_sib-data-active: ;}")
      // focus-within joins the self pseudo toggles too
      expect(result).toContain('._:focus-within {--toned_focus-within: ;}')
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
      expect(result).toContain('@media (min-width: 768px) {.\\@md\\:maxW_gutter')
      // ascending order: the md classes come after the sm classes, and both
      // after the resting atomics, so an active breakpoint wins by order
      expect(result.indexOf('.maxW_gutter{')).toBeLessThan(
        result.indexOf('\\@sm\\:maxW_gutter'),
      )
      expect(result.indexOf('\\@sm\\:maxW_gutter')).toBeLessThan(
        result.indexOf('\\@md\\:maxW_gutter'),
      )
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
        containers: { 'field-group': { md: '28rem' }, card: { sm: 320 } },
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
        { containers: { card: { sm: 320 } } },
        { conditions: ['card/>=25rem', 'card/>=400'] },
      )
      expect(result).toContain(
        '@container card (min-width: 25rem) { ._ { --cq-card-gte25rem: ; --cq-card-gte25rem-not: initial; } }',
      )
      expect(result).toContain(
        '@container card (min-width: 400px) { ._ { --cq-card-gte400: ; --cq-card-gte400-not: initial; } }',
      )
      expect(result).toContain('--cq-card-gte400: initial;--cq-card-gte400-not: ;')
    })

    test('a scoped system scopes both halves', () => {
      const result = generate(
        { containers: { card: { sm: 320 } } },
        { scope: '.ds2' },
      )
      expect(result).toContain('.ds2 ._ {--cq-card-sm: initial;--cq-card-sm-not: ;}')
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

  describe('declared-state cross-element channel', () => {
    test('emits a --toned_src-<alias> channel per attribute/pseudo state', () => {
      const result = generate({ states: { open: "[data-state='open']" } })

      // self-state toggle (existing behaviour) still emits
      expect(result).toContain('--toned_open: initial;')
      expect(result).toContain("._[data-state='open'] {--toned_open: ;}")

      // cross-element source channel: gated by the source's state, propagates to
      // descendants, reset by a nested source (nearest-wins), NOT hover-gated
      expect(result).toContain('--toned_src-open: initial;')
      expect(result).toContain("._s[data-state='open'] {--toned_src-open: ;}")
      expect(result).toContain(
        "._s[data-state='open'] ._s {--toned_src-open: initial;}",
      )
      expect(result).toContain(
        "._s[data-state='open'] ._s[data-state='open'] {--toned_src-open: ;}",
      )
    })

    test('a :pseudo state selector attaches its source channel to ._s', () => {
      const result = generate({ states: { disabled: ':disabled' } })
      expect(result).toContain('._s:disabled {--toned_src-disabled: ;}')
    })
  })

  describe('skips boxed primitives', () => {
    test('skips values that are boxed Number instances', () => {
      const result = generate({
        spacing: {
          values: [
            'sm',
            // biome-ignore lint/complexity/useArrowFunction: testing boxed primitive
            // biome-ignore lint/suspicious/noExplicitAny: testing boxed primitive
            new Number(999) as any,
          ],
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
          values: [
            'red',
            // biome-ignore lint/complexity/useArrowFunction: testing boxed primitive
            // biome-ignore lint/suspicious/noExplicitAny: testing boxed primitive
            new String('dynamic') as any,
          ],
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
    test('returns empty string when no tokens are provided', () => {
      const result = generate({})

      expect(result).toBe('')
    })

    test('returns empty string when tokens have no values or resolve', () => {
      const result = generate({
        notAToken: undefined,
      })

      expect(result).toBe('')
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

      expect(result).toContain(".my-ds .bgColor_primary{")
      expect(result).toContain(".my-ds .bgColor\\$50{")
      expect(result).toContain(".my-ds ._[data-state='open'] {--toned_open: ;}")
      // Custom-property inits and @property registrations stay global —
      // idempotent between systems, and a scoped @property is not a thing.
      expect(result).toContain('html {--toned_open: initial;}')
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
      breakpoints: { __breakpoints: { sm: 480, pointerCoarse: '(pointer: coarse)' } },
    } as never)
    expect(css).toContain('@media (pointer: coarse) { html { --media-pointer-coarse: ; --media-pointer-coarse-not: initial; } }')
    expect(css).toContain('@media (min-width: 480px) { html { --media-sm: ; --media-sm-not: initial; } }')
  })
})
