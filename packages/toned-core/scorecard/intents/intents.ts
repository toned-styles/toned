/**
 * The intent table: for each thing an author wants to do, its one canonical
 * spelling and every other spelling in use today, with its status. "One
 * spelling per intent" is measured from this data, so an alias is added here
 * when it is found, and removed only when the tools turn it into an error.
 *
 * `source` says where the spelling was seen: the toned README, the stack
 * review of the HQ apps (13 November 2026), or a probe of the current code.
 */

/**
 * - compatible: documented, kept for compatibility, still accepted silently;
 * - app-helper: written by an application on top of toned (not toned API);
 * - workaround: accepted toned API used for something it was not meant for;
 * - redundant: accepted, and has no effect;
 * - error: still accepted at runtime, but the compiler or a toned lint rule
 *   rejects it with a message naming the canonical spelling; not counted;
 * - removed: no longer exported, but still taught somewhere; not counted.
 */
export type AliasStatus =
  | 'compatible'
  | 'app-helper'
  | 'workaround'
  | 'redundant'
  | 'error'
  | 'removed'

export type Source = 'readme' | 'stack-review' | 'probe'

export type Spelling = { spelling: string; note?: string; source: Source }

export type Intent = {
  id: string
  intent: string
  canonical: Spelling
  aliases: readonly (Spelling & { status: AliasStatus })[]
}

const review = 'stack-review' as const

export const intents: readonly Intent[] = [
  {
    id: 'web-only-value',
    intent: 'Use a value only on web',
    canonical: {
      spelling: "$style: { … } in a system declaring targets: ['web']",
      note: "in a system with several targets, `'@platform web': { $style: { … } }`",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "'@platform.web': { $style: { … } }",
        status: 'error',
        note: '`toned/canonical-platform-key` rejects it and fixes the key',
        source: 'probe',
      },
      {
        spelling: '...web({ … })',
        status: 'app-helper',
        note: "an app helper spread into a part; nine copies in two different types in HQ; replaced by `targets: ['web']`, pending the HQ migration",
        source: review,
      },
    ],
  },
  {
    id: 'hover-gating',
    intent: 'Apply hover only on devices that can hover',
    canonical: {
      spelling: "':hover': { … }",
      note: 'core wraps `:hover`, the source channel and every declared state whose selector contains `:hover` in `@media (hover: hover)`',
      source: review,
    },
    aliases: [
      {
        spelling: "'@can-hover': { ':hover': { … } }",
        status: 'redundant',
        note: 'the media wrapper does nothing around a gated `:hover`',
        source: review,
      },
      {
        spelling: "':row-hover': { … }",
        status: 'workaround',
        note: "a declared state whose selector contains `:hover` (`states: { 'row-hover': '…:hover' }`); gated by core like `:hover`",
        source: review,
      },
      {
        spelling: "'@can-hover': { ':row-hover': { … } }",
        status: 'redundant',
        note: 'core gates a declared state whose selector contains `:hover`, so the wrapper does nothing',
        source: review,
      },
    ],
  },
  {
    id: 'ancestor-state',
    intent: 'Style a part while an ancestor part is in a declared state',
    canonical: {
      spelling: "'Trigger:open': { Chevron: { … } }",
      note: "the state declares the relation: `states: { open: { selector, relations: ['ancestor'] } }`; a state without it is a type error",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "[q.part('Trigger').state('open')]: { Chevron: { … } }",
        status: 'error',
        note: '`toned/canonical-condition-key` fixes it to the string key; `q.part(…).has(…)` relations stay builders',
        source: 'readme',
      },
    ],
  },
  {
    id: 'ancestor-hover',
    intent: 'Style a part while an ancestor part is hovered',
    canonical: {
      spelling: "'Card:hover': { Title: { … } }",
      note: 'the source channel',
      source: 'readme',
    },
    aliases: [
      {
        spelling: "Card: { ':hover': { textColor: … } }",
        status: 'workaround',
        note: 'hover on the ancestor, relying on inherited properties',
        source: review,
      },
    ],
  },
  {
    id: 'ancestor-component',
    intent: "Style a part by an ancestor component's state or kind",
    canonical: {
      spelling: "'@within card:hover': { … }",
      note: "the provider part declares `$context: 'card'` (`'prose=faq'` for a valued context, in a variant block); the system declares `contexts: { card: { states: ['hover'] }, prose: { values: ['faq'] } }`. `'@within prose=faq'` and `'@within card'` read a value and the context itself",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "':in-hovered-card': { … }",
        status: 'workaround',
        note: "a hand-written selector state such as `':is([class~=\"tnd-bento-card\"]:hover *)'`: the website branch's 17 `in-hovered-*` / `in-open-*` states, each coupled to a `tnd-` class-name string",
        source: review,
      },
      {
        spelling: "':in-faq-answer': { … }",
        status: 'workaround',
        note: "a hand-written selector state such as `':where([data-prose=\"faq\"] > *)'`: the website branch's 10 prose `in-*` states, written with `:where` where the hover ones use `:is`",
        source: review,
      },
    ],
  },
  {
    id: 'placeholder-colour',
    intent: "Colour an input's placeholder",
    canonical: {
      spelling: "placeholderColor: 'muted'",
      note: "a token whose resolver writes `bridgeVarName('placeholder', 'color')`; needs the `placeholder` bridge declared in the system. A raw value is the pseudo-element intent: `$bridge: { placeholder: { color: … } }`",
      source: 'readme',
    },
    aliases: [
      {
        spelling:
          "'@platform web': { $style: { '--toned-b-placeholder-color': … } }",
        status: 'error',
        note: '`toned/prefer-bridge-key` fixes it to `$bridge`; a parameter no declared bridge reads is a type error',
        source: review,
      },
      {
        spelling: "$webRules: webRules({ '&::placeholder': { color: … } })",
        status: 'workaround',
        note: 'deprecated: `toned/no-web-rules` warns, naming the bridge',
        source: 'readme',
      },
    ],
  },
  {
    id: 'component-option',
    intent: "Style one of a component's own options (size, tone, appearance)",
    canonical: {
      spelling: ".variants(($: Variants<Mods>) => ({ [$.size('s')]: … }))",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "':appearance-ghost': { … }",
        status: 'workaround',
        note: 'a declared attribute state with `data-appearance` written in markup; untyped, so a misspelled value matches nothing; 211 such states on the website',
        source: review,
      },
    ],
  },
  {
    id: 'dom-fact',
    intent: 'Style a DOM or ARIA fact (disabled, open, checked)',
    canonical: {
      spelling: "':disabled': { … }",
      note: 'a declared state',
      source: 'readme',
    },
    aliases: [
      {
        spelling: "[q.state('disabled')]: { … }",
        status: 'error',
        note: '`toned/canonical-condition-key` fixes it to the string key',
        source: 'readme',
      },
      {
        spelling: "$webRules: webRules({ '&[aria-disabled=true]': { … } })",
        status: 'workaround',
        note: 'web only; native, inline and PDF reject CSS extensions; deprecated: `toned/no-web-rules` warns, naming declared states',
        source: 'readme',
      },
    ],
  },
  {
    id: 'derive-sheet',
    intent: 'Derive a stylesheet from another',
    canonical: { spelling: 'sheet.extend(rules, variants?)', source: 'readme' },
    aliases: [
      {
        spelling: 'overrideStyles(…) / overrideSheet(…)',
        status: 'removed',
        note: 'no longer exported; HQ docs taught it until #2471',
        source: review,
      },
    ],
  },
  {
    id: 'subtree-restyle',
    intent: 'Restyle a component inside one subtree',
    canonical: {
      spelling: '<StyleOverrides> + sheet.extend(…)',
      note: 'React: the override takes sheets derived by `extend`',
      source: 'readme',
    },
    aliases: [
      {
        spelling: '<StyleOverrides> + overrideSheet(…)',
        status: 'removed',
        source: review,
      },
    ],
  },
  {
    id: 'platform-block',
    intent: 'Open a platform block',
    canonical: {
      spelling: "'@platform web'",
      note: "what `q.platform('web')` returns",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "'@platform.web'",
        status: 'error',
        note: 'deprecated; `toned/canonical-platform-key` fixes it, and both spellings in one part are a type error',
        source: 'probe',
      },
      {
        spelling: "[q.platform('web')]",
        status: 'error',
        note: '`toned/canonical-condition-key` fixes it to the string key',
        source: 'readme',
      },
    ],
  },
  {
    id: 'compose-fragments',
    intent: 'Compose shared style fragments into a part',
    canonical: {
      spelling: '$style: [focusRing, cond && still, { … }]',
      note: 'merged in order, the last wins; falsy entries are skipped; `null` unsets',
      source: 'readme',
    },
    aliases: [
      {
        spelling: 'Root: { ...focusRing, ...still }',
        status: 'error',
        note: '`toned/no-shadowing-spread` reports a spread whose `$style`, platform or condition key is set again, naming the key',
        source: review,
      },
    ],
  },
  {
    id: 'part-kind',
    intent: "Declare a part's kind",
    canonical: { spelling: "$kind: 'text'", source: 'readme' },
    aliases: [
      { spelling: "$$type: 'text'", status: 'compatible', source: 'readme' },
    ],
  },
  {
    id: 'raw-style',
    intent: 'Write a low-level style on a part',
    canonical: { spelling: '$style: { … }', source: 'readme' },
    aliases: [
      { spelling: 'style: { … }', status: 'compatible', source: 'readme' },
    ],
  },
  {
    id: 'media-condition',
    intent: 'Apply a declared media condition',
    canonical: { spelling: "'@md': { … }", source: 'readme' },
    aliases: [
      {
        spelling: "[q.media('md')]: { … }",
        status: 'error',
        note: '`toned/canonical-condition-key` fixes it to the string key',
        source: 'readme',
      },
      {
        spelling: "'@media md': { … }",
        status: 'error',
        note: '`toned/canonical-condition-key` fixes it to `@md`',
        source: 'readme',
      },
    ],
  },
  {
    id: 'container-condition',
    intent: 'Apply a declared container step',
    canonical: {
      spelling: "'@field/wide': { … }",
      note: 'a computed step has no string form and stays a builder: `[q.container(name, dp(n))]`',
      source: 'readme',
    },
    aliases: [
      {
        spelling: "[q.container('field', 'wide')]: { … }",
        status: 'error',
        note: '`toned/canonical-condition-key` fixes it to the string key',
        source: 'readme',
      },
      {
        spelling: "'@container field wide': { … }",
        status: 'error',
        note: '`toned/canonical-condition-key` fixes it to `@field/wide`',
        source: 'readme',
      },
    ],
  },
  {
    id: 'compound-condition',
    intent: 'Combine conditions',
    canonical: {
      spelling: "'@md&!lg': { … }",
      note: "media and container atoms with `&`, `|` and `!`; with a state, nest: `'@md': { ':hover': { … } }`; states together: `':open:hover'`",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "[q.all(q.media('md'), q.not(q.media('lg')))]: { … }",
        status: 'error',
        note: '`toned/canonical-condition-key` fixes it to the string key or the nested form; `q.all`, `q.any` and `q.not` stay for what a string cannot express (a state inside `q.any` or `q.not`, a relation)',
        source: 'readme',
      },
    ],
  },
  {
    id: 'pseudo-element',
    intent: 'Style a pseudo-element or descendant a declared bridge reaches',
    canonical: {
      spelling: "$bridge: { scrollbar: { display: 'none' } }",
      note: "typed from the system's `bridges`: an undeclared bridge or property is a type error listing the declared ones; core writes `--toned-b-scrollbar-display`, never renamed by namespacing",
      source: 'readme',
    },
    aliases: [
      {
        spelling:
          "'@platform web': { $style: { '--toned-b-scrollbar-display': 'none' } }",
        status: 'error',
        note: '`toned/prefer-bridge-key` fixes it to `$bridge`; a parameter no declared bridge reads is a type error',
        source: review,
      },
      {
        spelling: "$webRules: webRules({ '&::-webkit-scrollbar': { … } })",
        status: 'workaround',
        note: 'web only, and outside the token system',
        source: 'readme',
      },
    ],
  },
  {
    id: 'width-condition',
    intent: 'Apply a width threshold that has no name',
    canonical: {
      spelling: '[q.media(dp(600))]: { … }',
      note: "the width is declared in the system: `conditions.widths: { media: [600] }` (containers: `widths.containers.card`, `q.container('card', dp(300))`); an undeclared width is a type error naming where to declare it",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "'@>=600px': { … }",
        status: 'compatible',
        note: 'the literal key `q.media` returns; narrowed to the declared widths too',
        source: 'readme',
      },
    ],
  },
  {
    id: 'state-motion',
    intent: 'Animate a part when a declared state changes',
    canonical: {
      spelling: "defineMotion(ui, { states: { ':open': transition } })",
      note: 'the same declared states (or a `q.all` of them) that style the part; a Weft run passes its open waits as the `states` source',
      source: 'readme',
    },
    aliases: [
      {
        spelling: 'useMotion(open ? slow : fast)',
        status: 'workaround',
        note: 'a new options identity replaces the controller and cancels the running transition',
        source: 'probe',
      },
      {
        spelling: "attachMotion(host, { states: { ':open': … } })",
        status: 'error',
        note: 'a type error naming `defineMotion(system, { states })`, which checks the state names',
        source: 'probe',
      },
    ],
  },
  {
    id: 'colour-motion',
    intent: 'Animate a colour',
    canonical: {
      spelling: "properties: ['backgroundColor']",
      note: 'interpolated in Oklab on web and native; token colours resolve through the active theme',
      source: 'readme',
    },
    aliases: [
      {
        spelling:
          "'@platform web': { $style: { transition: 'background-color 200ms' } }",
        status: 'workaround',
        note: 'web only, interpolated in sRGB, not on the shared clock, and reduced motion is left to the author',
        source: 'probe',
      },
    ],
  },
  {
    id: 'transform-motion',
    intent: 'Move, scale or rotate a part',
    canonical: {
      spelling: "properties: ['translateY', 'scale']",
      note: 'separate channels; individual CSS transform properties on web, the transform array on native',
      source: 'readme',
    },
    aliases: [
      {
        spelling:
          "'@platform web': { $style: { transform: 'translateY(8px)', transition: 'transform 200ms' } }",
        status: 'workaround',
        note: 'web only; one transform string, so translate and scale cannot be interrupted separately',
        source: 'probe',
      },
    ],
  },
  {
    id: 'motion-clock',
    intent: 'Step motion time in a test or replay',
    canonical: {
      spelling: 'createTestClock() + clock.advance(ms)',
      note: 'one clock shared through `attachMotion(host, motion, { clock })` or `<MotionClockProvider clock={clock}>`',
      source: 'readme',
    },
    aliases: [
      {
        spelling: 'frames: driver',
        status: 'compatible',
        note: "one motion's own clock; it takes precedence over the shared clock",
        source: 'readme',
      },
      {
        spelling: 'a hand-written frame driver with a pending-callback map',
        status: 'workaround',
        note: "what toned's own motion tests wrote before `createTestClock`",
        source: 'probe',
      },
    ],
  },
  {
    id: 'declare-outputs',
    intent: "Make a package's named outputs available to its consumers",
    canonical: {
      spelling: '"toned": { "outputs": ["src/toned/*.toned.ts"] }',
      note: "in the package's package.json; Vite, Bun, Metro and scripts find it through the dependency graph",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "tonedOutputs({ outputs: ['…/*.toned.ts'] })",
        status: 'compatible',
        note: 'explicit globs in each consumer (also `tonedBunPlugin`, `withTonedOutputs`, `loadOutput`); replace the declarations; HQ writes them in about 15 places',
        source: review,
      },
    ],
  },
  {
    id: 'outputs-in-a-script',
    intent: 'Import `toned:` outputs from a Bun script or test',
    canonical: {
      spelling: 'bun --preload @toned/core/bun/register',
      note: 'or `preload` in bunfig.toml',
      source: 'readme',
    },
    aliases: [
      {
        spelling: 'Bun.plugin(tonedBunPlugin({ outputs, root }))',
        status: 'compatible',
        note: 'a hand-written preload',
        source: 'readme',
      },
    ],
  },
  {
    id: 'output-file',
    intent: "Write an output file's default export",
    canonical: {
      spelling: 'export default defineOutput({ css, data })',
      note: 'a misspelled key, data that is not JSON or an unawaited promise is a type error; a `buildStyles` artifact may be passed as it is',
      source: 'readme',
    },
    aliases: [
      {
        spelling: 'export default { css, data }',
        status: 'compatible',
        note: 'not typed; the shape is checked when the output builds',
        source: 'readme',
      },
    ],
  },
  {
    id: 'responsive-atoms',
    intent: 'Give a token responsive classes under the conditions it uses',
    canonical: {
      spelling: "responsiveTokens: { maxW: ['md', 'lg'] }",
      note: 'only the declared pairs emit atoms; another pair is a type error',
      source: 'readme',
    },
    aliases: [
      {
        spelling: "responsiveTokens: ['maxW']",
        status: 'compatible',
        note: 'emits the token under every declared condition, including non-width ones',
        source: 'readme',
      },
    ],
  },
]

/** Spellings an author can write today without being told otherwise: the
 *  canonical one plus the aliases nothing rejects. */
export const spellingsOf = (intent: Intent): number =>
  1 +
  intent.aliases.filter(
    (alias) => alias.status !== 'removed' && alias.status !== 'error',
  ).length

export function intentMetrics(table: readonly Intent[] = intents) {
  const counts = table.map(spellingsOf)
  const total = counts.reduce((sum, count) => sum + count, 0)
  return {
    intents: table.length,
    intentsWithOneSpelling: counts.filter((count) => count === 1).length,
    spellingsTotal: total,
    spellingsMax: Math.max(...counts),
    spellingsMean: Math.round((total / table.length) * 100) / 100,
  }
}

const cell = (text: string) => text.replaceAll('|', '\\|')

/**
 * Undoes oxfmt's table padding, so the checked-in (formatted) document can
 * be compared with a fresh render.
 */
export const normaliseTable = (markdown: string): string =>
  markdown
    .split('\n')
    .map((line) =>
      line.startsWith('|')
        ? line.replace(/ {2,}/g, ' ').replace(/-{3,}/g, '---')
        : line,
    )
    .join('\n')

/** The generated document (`INTENTS.md`). */
export function renderIntentTable(table: readonly Intent[] = intents): string {
  const metrics = intentMetrics(table)
  const rows = table.map((intent) => {
    const aliases = intent.aliases
      .map(
        (alias) =>
          `\`${cell(alias.spelling)}\` (${alias.status}${alias.note ? `: ${cell(alias.note)}` : ''})`,
      )
      .join('<br>')
    return `| ${intent.intent} | \`${cell(intent.canonical.spelling)}\`${intent.canonical.note ? ` (${cell(intent.canonical.note)})` : ''} | ${aliases || '—'} | ${spellingsOf(intent)} |`
  })
  return [
    '# Toned intent table',
    '',
    '<!-- Generated from scorecard/intents/intents.ts by `bun scorecard/scorecard.ts --write`. Do not edit. -->',
    '',
    'Each author intent, its one canonical spelling, and every other spelling in use',
    'today. The target is one spelling per intent, with every alias an error that',
    'names the canonical spelling. Spellings that are errors (compiler or toned lint',
    'rule) and removed spellings are listed but not counted.',
    '',
    `${metrics.intents} intents, ${metrics.spellingsTotal} spellings (mean ${metrics.spellingsMean}, max ${metrics.spellingsMax}); ${metrics.intentsWithOneSpelling} with one spelling.`,
    '',
    '| Intent | Canonical | Other spellings (status) | Spellings |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}
