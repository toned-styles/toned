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
 * - removed: no longer exported, but still taught somewhere; not counted.
 */
export type AliasStatus =
  | 'compatible'
  | 'app-helper'
  | 'workaround'
  | 'redundant'
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
      spelling: "'@platform web': { $style: { … } }",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "'@platform.web': { $style: { … } }",
        status: 'compatible',
        note: "`q.platform('web')` returns this spelling",
        source: 'probe',
      },
      {
        spelling: '...web({ … })',
        status: 'app-helper',
        note: 'an app helper spread into a part; nine copies in two different types in HQ; a second spread overwrites the first',
        source: review,
      },
    ],
  },
  {
    id: 'hover-gating',
    intent: 'Apply hover only on devices that can hover',
    canonical: {
      spelling: "':hover': { … }",
      note: 'core already wraps `:hover` and the source channel in `@media (hover: hover)`',
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
        note: "a declared state whose selector contains `:hover` (`states: { 'row-hover': '…:hover' }`); not gated by core",
        source: review,
      },
      {
        spelling: "'@can-hover': { ':row-hover': { … } }",
        status: 'workaround',
        note: 'the wrapper is needed here, unlike above; an author cannot tell which case applies',
        source: review,
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
      {
        spelling: "':in-hovered-card': { … }",
        status: 'workaround',
        note: "a hand-written selector state such as `':is([data-pause]:hover > *)'`; 28 on the website, some depending on class-name strings",
        source: review,
      },
    ],
  },
  {
    id: 'placeholder-colour',
    intent: "Colour an input's placeholder",
    canonical: {
      spelling: "placeholderColor: 'muted'",
      note: "a token whose resolver writes `bridgeVarName('placeholder', 'color')`; needs the `placeholder` bridge declared in the system",
      source: 'readme',
    },
    aliases: [
      {
        spelling:
          "'@platform web': { $style: { '--toned-b-placeholder-color': … } }",
        status: 'workaround',
        note: 'any `--*` key type-checks, so a misspelling is silent',
        source: review,
      },
      {
        spelling: "$webRules: webRules({ '&::placeholder': { color: … } })",
        status: 'workaround',
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
        spelling: "$webRules: webRules({ '&[aria-disabled=true]': { … } })",
        status: 'workaround',
        note: 'web only; native, inline and PDF reject CSS extensions',
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
    canonical: { spelling: "'@platform web'", source: 'readme' },
    aliases: [
      {
        spelling: "'@platform.web'",
        status: 'compatible',
        note: "what `q.platform('web')` returns; both in one part lose one block silently",
        source: 'probe',
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
    canonical: {
      spelling: "[q.media('md')]: { … }",
      note: "returns the literal key `'@md'`",
      source: 'readme',
    },
    aliases: [
      { spelling: "'@md': { … }", status: 'compatible', source: 'readme' },
      {
        spelling: "'@media md': { … }",
        status: 'compatible',
        source: 'readme',
      },
    ],
  },
  {
    id: 'container-condition',
    intent: 'Apply a declared container step',
    canonical: {
      spelling: "[q.container('field', 'wide')]: { … }",
      source: 'readme',
    },
    aliases: [
      {
        spelling: "'@field/wide': { … }",
        status: 'compatible',
        source: 'readme',
      },
      {
        spelling: "'@container field wide': { … }",
        status: 'compatible',
        source: 'readme',
      },
    ],
  },
]

/** Spellings an author can write today: the canonical one plus live aliases. */
export const spellingsOf = (intent: Intent): number =>
  1 + intent.aliases.filter((alias) => alias.status !== 'removed').length

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
    'names the canonical spelling. Removed spellings are listed but not counted.',
    '',
    `${metrics.intents} intents, ${metrics.spellingsTotal} spellings (mean ${metrics.spellingsMean}, max ${metrics.spellingsMax}); ${metrics.intentsWithOneSpelling} with one spelling.`,
    '',
    '| Intent | Canonical | Other spellings (status) | Spellings |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}
