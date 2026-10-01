import { createFileRoute, Link } from '@tanstack/react-router'
import { useStyles } from '@toned/react'
import { CodeBlock } from '../../components/CodeBlock.tsx'
import { proseStyles } from '../../styles/prose.ts'

export const Route = createFileRoute('/api/variants')({
  component: ApiVariants,
})

function ApiVariants() {
  const s = useStyles(proseStyles)
  return (
    <article {...s.container}>
      <h1 {...s.h1}>variants</h1>
      <p>
        The <code {...s.code}>.variants()</code> method chains onto a stylesheet
        to add conditional styling based on component state. Annotate the
        selector parameter with <code {...s.code}>Variants&lt;Mods&gt;</code>.
        Toned infers the returned rules and checks their parts, token values,
        and nested declarations.
      </p>
      <p>
        A design-system module can re-export the{' '}
        <code {...s.code}>Variants</code> type. With a namespace import such as{' '}
        <code {...s.code}>import * as ui from './ui'</code>, write{' '}
        <code {...s.code}>$: ui.Variants&lt;Mods&gt;</code>. The optional second
        callback parameter, <code {...s.code}>q</code>, infers the declared
        parts and system conditions. No currying or validation wrapper is
        needed. Older signatures remain available for compatibility.
      </p>

      <h2 {...s.h2} id="signature">
        Signature
      </h2>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const styles = stylesheet({ PartName: {} }).variants(($: Variants<{ variantName: 'value' }>) => ({
  [$.variantName('value')]: {
    PartName: { /* token overrides */ },
  },
}))`}</CodeBlock>

      <h2 {...s.h2} id="defining-variants">
        Defining Variants
      </h2>
      <p>
        Reuse ordinary TypeScript types for variant keys and their allowed
        values. A required axis without a default must be provided by the
        consumer; an optional axis (marked with <code {...s.code}>?</code>) can
        be omitted. A rule matches when its selector values are selected:
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

type Size = 'm' | 's'
type ButtonVariants = {
  size: Size                 // reusable axis type
  variant: 'accent' | 'danger' // required
  alignment?: 'icon-only' | 'icon-left' | 'icon-right' // optional
}

const buttonStyles = stylesheet({
  Root: {
    $kind: 'pressable',
    borderRadius: 'medium',
    borderWidth: 'none',
    cursor: 'pointer',
  },
  Label: { $kind: 'text', typography: 'label-medium' },
}).variants(($: Variants<ButtonVariants>) => ({
  [$.variant('accent')]: {
    Root: { bgColor: 'action' },
    Label: { textColor: 'on_action' },
  },
  [$.variant('danger')]: {
    Root: { bgColor: 'destructive' },
    Label: { textColor: 'on_destructive' },
  },
  [$.size('m')]: {
    Root: { paddingX: 3 },
  },
  [$.size('s')]: {
    Root: { paddingX: 2, paddingY: 1 },
  },
}))`}</CodeBlock>

      <h2 {...s.h2} id="defaults">
        Defaults
      </h2>
      <p>
        Pass <code {...s.code}>defaults</code> as the second argument to give an
        axis the value it has when the component does not set one. An axis with
        a default becomes optional for the component; passing{' '}
        <code {...s.code}>undefined</code> selects the default too.
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const tagStyles = stylesheet({
  Root: { borderRadius: 'medium' },
}).variants(($: Variants<{ size: 'm' | 's'; variant: 'accent' | 'danger' }>) => ({
  [$.size('m')]: { Root: { paddingX: 3 } },
  [$.size('s')]: { Root: { paddingX: 2 } },
  [$.variant('accent')]: { Root: { bgColor: 'action' } },
  [$.variant('danger')]: { Root: { bgColor: 'destructive' } },
}), { defaults: { size: 'm' } })

// size is optional and is 'm' when omitted; variant is still required.`}</CodeBlock>

      <h2 {...s.h2} id="the-dollar-sign-builder">
        The Dollar-Sign Builder
      </h2>
      <p>
        The callback receives a <code {...s.code}>$</code> builder object with a
        method for each variant key. Calling{' '}
        <code {...s.code}>$.size('m')</code> produces a computed key that the
        runtime uses to match against the variant values a component selects.
        The keys it returns, and every other key a rule accepts, are listed in{' '}
        <Link to="/api/conditions" hash="variant-selectors">
          Conditions and selectors
        </Link>
        .
      </p>

      <h2 {...s.h2} id="compound-variants">
        Compound Variants
      </h2>
      <p>
        Chain multiple variant calls to create compound conditions that only
        match when all specified variants are active simultaneously:
      </p>
      <CodeBlock>{`// Inside the .variants callback:
{
  [$.size('m').alignment('icon-only')]: {
    Root: { paddingX: 2, paddingY: 2 },
  },
  [$.size('s').alignment('icon-only')]: {
    Root: { paddingX: 1, paddingY: 1 },
  },
}`}</CodeBlock>
      <p>
        Matching variant rules apply in declaration order: later rules win
        conflicting properties. Chaining selectors adds conditions, not an
        automatic specificity bonus. Put a compound rule after the individual
        rules it should override.
      </p>

      <h2 {...s.h2} id="pseudo-state-variants">
        Pseudo-state Variants
      </h2>
      <p>
        Colocate a state rule under the part it styles. Use{' '}
        <code {...s.code}>':hover'</code> or the inferred{' '}
        <code {...s.code}>[q.state('hover')]</code> key inside that part:
      </p>
      <CodeBlock>{`[$.variant('accent')]: {
  Root: {
    bgColor: 'action',
    ':hover': { bgColor: 'action_secondary' },
  },
  Label: { textColor: 'on_action' },
}`}</CodeBlock>

      <h2 {...s.h2} id="responsive-variants">
        Responsive Variants
      </h2>
      <p>
        Breakpoints work inside variant blocks, so a variant can define
        responsive overrides for its elements:
      </p>
      <CodeBlock>{`[$.layout('grid')]: {
  Root: {
    flexLayout: 'column',
    gap: 2,
    '@media md': {
      flexLayout: 'row',
      flexWrap: 'wrap',
    },
    '@media lg': {
      gap: 4,
    },
  },
}`}</CodeBlock>

      <h3 {...s.h3} id="compound-queries-inside-variants">
        Compound Queries Inside Variants
      </h3>
      <p>
        The second callback argument uses the same query builders as a base
        stylesheet. Combine media, state and platform conditions where the
        affected part is declared; no extra chaining method is needed.
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const styles = stylesheet({ Root: { opacity: 1 } })
  .variants(($: Variants<{ variant: 'accent' | 'quiet' }>, q) => ({
    [$.variant('accent')]: {
      Root: {
        [q.all(q.media('md'), q.not(q.state('active')))]: {
          opacity: 0.75,
        },
        [q.any(q.state('hover'), q.state('focus'))]: {
          opacity: 1,
        },
      },
    },
  }))`}</CodeBlock>

      <h2 {...s.h2} id="named-styles-compose">
        Named Styles ($compose)
      </h2>
      <p>
        When multiple variants share common element overrides, you can extract
        them into a <strong>named style</strong> and compose them into variants.
        This avoids duplicating the same token values across variant rules.
      </p>

      <h3 {...s.h3} id="defining-named-styles">
        Defining Named Styles
      </h3>
      <p>
        Use <code {...s.code}>$('name')</code> to define a named style block.
        Named styles are not variant rules — they are reusable fragments that
        can be composed into actual variants:
      </p>
      <CodeBlock>{`import type { Variants } from '@toned/core'

const buttonStyles = stylesheet({
  Root: { $kind: 'pressable', borderRadius: 'medium' },
  Label: { $kind: 'text' },
}).variants(($: Variants<{ size: 'm' | 's'; variant: 'accent' | 'danger' }>) => ({
  // Named style — shared across variants
  [$('interactive')]: {
    Root: { ':hover': { shadow: 'medium' } },
  },

  [$.variant('accent')]: {
    $compose: 'interactive',
    Root: { bgColor: 'action' },
    Label: { textColor: 'on_action' },
  },

  [$.variant('danger')]: {
    $compose: 'interactive',
    Root: { bgColor: 'destructive' },
    Label: { textColor: 'on_destructive' },
  },
}))`}</CodeBlock>
      <p>
        Both <code {...s.code}>accent</code> and <code {...s.code}>danger</code>{' '}
        inherit the hover shadow from <code {...s.code}>interactive</code>,
        without repeating it.
      </p>

      <p>
        Named references autocomplete and reject misspellings. Composition is
        recursive: later entries in an array override earlier entries, then the
        consuming rule’s own properties win. Untyped declarations with unknown
        references or cycles throw when the stylesheet is constructed.
      </p>

      <h3 {...s.h3} id="element-level-compose">
        Element-Level $compose
      </h3>
      <p>
        Inside a variant rule, you can compose a declared part from another
        element defined in the same block. This is useful when several elements
        within a variant share a base set of tokens:
      </p>
      <CodeBlock>{`[$.size('s')]: {
  Base: { paddingX: 2, bgColor: 'muted' },
  Root: {
    $compose: 'Base',
    borderRadius: 'medium',
  },
  Sidebar: {
    $compose: 'Base',
    borderRadius: 'small',
  },
}`}</CodeBlock>
      <p>
        Here both <code {...s.code}>Root</code> and{' '}
        <code {...s.code}>Sidebar</code> inherit{' '}
        <code {...s.code}>paddingX</code> and <code {...s.code}>bgColor</code>{' '}
        from <code {...s.code}>Base</code>, then add their own overrides. The
        source (<code {...s.code}>Base</code>) must be a declared part. It
        remains available to render. A sibling definition in the same rule takes
        precedence over that part’s base declaration.
      </p>

      <h3 {...s.h3} id="composing-multiple-sources">
        Composing Multiple Sources
      </h3>
      <p>
        Pass an array to <code {...s.code}>$compose</code> to merge from
        multiple named styles. They are applied in order, and the variant's own
        properties always take priority:
      </p>
      <CodeBlock>{`[$('borders')]: {
  Root: { borderWidth: 'thin', borderColor: 'subtle' },
},
[$('spacing')]: {
  Root: { paddingX: 3, paddingY: 2 },
},

[$.size('m')]: {
  $compose: ['borders', 'spacing'],
  Root: { bgColor: 'elevated' },  // own props override composed ones
}`}</CodeBlock>

      <h2 {...s.h2} id="consuming-variants">
        Consuming Variants
      </h2>
      <p>
        Bind the sheet once with <code {...s.code}>createElements</code> and
        pass variant values to the family provider. Every part inside reads them
        from it. When you need prop bags instead,{' '}
        <code {...s.code}>useStyles(buttonStyles, {'{ size, variant }'})</code>{' '}
        takes the same values:
      </p>
      <CodeBlock>{`const S = createElements(buttonStyles)

function Button({ label, size, variant }: Props) {
  return (
    <S size={size} variant={variant}>
      <S.Root as="button" type="button">
        <S.Label as="span">{label}</S.Label>
      </S.Root>
    </S>
  )
}`}</CodeBlock>
    </article>
  )
}
