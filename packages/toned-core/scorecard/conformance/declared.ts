/**
 * The declared-target conformance matrix: the same features, each written
 * for a system that declares exactly one target (`defineSystem({ targets })`)
 * and rendered by that target. Where a target is declared, a feature it
 * cannot render should be a type error at the stylesheet, not a runtime
 * rejection; this matrix measures how far that holds.
 *
 * The features are rules (data), so each type probe builds the sheet with
 * the target's own system and the stylesheet's types decide. Condition keys
 * are written as strings, the canonical spelling.
 */
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildStyles } from '../../build/index.ts'
import {
  defineGrid,
  fr,
  type GridArea,
  type GridDefinition,
} from '../../grid/index.ts'
import type { Variants } from '../../index.ts'
import {
  createInlineRenderer,
  createNativeRenderer,
  createPdfRenderer,
  createWebRenderer,
} from '../../server/index.ts'
import { defineAnimations, defineSystem } from '../../system/index.ts'
import type { Target } from '../../types/targets.ts'
import { type WebRules, webRules } from '../../web/rules.ts'
import {
  bgColor,
  gap,
  opacity,
  padding,
  placeholderColor,
  textColor,
} from '../fixture/system.ts'
import { buildMatrix, type Feature } from './matrix.ts'

const motion = defineAnimations({
  'fade-in': {
    keyframes: { from: { opacity: 0 }, to: { opacity: 1 } },
    duration: 200,
  },
})

/** The fixture system's vocabulary, declaring one target. */
const declare = <const T extends Target>(target: T) =>
  defineSystem({
    id: `declared-${target}`,
    targets: [target],
    externalCssVariables: ['--app-surface'],
    tokens: {
      gap,
      padding,
      opacity,
      bgColor,
      textColor,
      placeholderColor,
      animation: motion.animation,
    },
    conditions: {
      animations: motion.animations,
      media: { md: 768 },
      states: { open: "[data-state='open']" },
      contexts: {
        card: { states: ['hover'] },
        prose: { values: ['faq'] },
      },
      bridges: {
        placeholder: { selector: '::placeholder', properties: ['color'] },
      },
    },
  })

export const systems = {
  web: declare('web'),
  native: declare('native'),
  email: declare('email'),
  pdf: declare('pdf'),
}

type Untyped = (sheet: object, options?: object) => unknown
type Name = keyof typeof systems

export const targets: Record<Name, Untyped> = {
  web: (sheet, options) =>
    (
      createWebRenderer(systems.web, {
        manifest: buildStyles(systems.web, { sheets: [sheet as never] })
          .manifest,
      }).resolve as Untyped
    )(sheet, options),
  native: (sheet, options) =>
    (createNativeRenderer(systems.native, { tokens: {} }).resolve as Untyped)(
      sheet,
      options,
    ),
  email: (sheet, options) =>
    (createInlineRenderer(systems.email, { tokens: {} }).resolve as Untyped)(
      sheet,
      options,
    ),
  pdf: (sheet, options) =>
    (createPdfRenderer(systems.pdf, { tokens: {} }).resolve as Untyped)(
      sheet,
      options,
    ),
}

const message = defineGrid('scorecard-declared-message', {
  columns: [fr(1), fr(2)],
  areas: [['avatar', 'body']],
})

type DeclaredFeature = {
  description: string
  rules: object
  /** Written inline in the probe, where the callback is contextually typed. */
  variants?: string
  options?: object
}

/** The variants feature's callback: the probe writes this source inline. */
const sizeVariants = ($: Variants<{ size: 's' | 'm' }>) => ({
  [$.size('m')]: { Root: { padding: 4 } },
})
const sizeVariantsSource =
  "($: Variants<{ size: 's' | 'm' }>) => ({ [$.size('m')]: { Root: { padding: 4 } } })"

export const features = {
  tokens: {
    description: 'finite token values',
    rules: { Root: { gap: 1, padding: 2, bgColor: 'accent' } },
  },
  variants: {
    description: 'a typed variant axis',
    rules: { Root: { padding: 1 } },
    variants: sizeVariantsSource,
    options: { variants: { size: 'm' } },
  },
  media: {
    description: 'a declared media condition',
    rules: { Root: { gap: 1, '@md': { gap: 2 } } },
  },
  'compound-condition': {
    description: 'condition algebra over declared conditions',
    rules: { Root: { gap: 1, '@!md': { gap: 2 } } },
  },
  state: {
    description: 'a declared state',
    rules: { Root: { gap: 1, ':open': { gap: 2 } } },
  },
  hover: {
    description: 'the built-in hover state',
    rules: { Root: { opacity: 1, ':hover': { opacity: 0.5 } } },
  },
  'source-channel': {
    description: "a cross-part key (`'Root:hover'`)",
    rules: {
      Root: { gap: 1 },
      Item: { padding: 1 },
      'Root:hover': { Item: { padding: 2 } },
    },
  },
  bridge: {
    description: 'a bridge token (placeholder colour)',
    rules: { Root: { placeholderColor: 'muted' } },
  },
  'context-provider': {
    description:
      "a context marker on a provider part (`$context: 'prose=faq'`)",
    rules: { Root: { $context: 'prose=faq', gap: 1 } },
  },
  'context-value': {
    description:
      "a part keyed on an ancestor's context value (`'@within prose=faq'`)",
    rules: { Root: { gap: 1, '@within prose=faq': { gap: 2 } } },
  },
  'context-state': {
    description: "a part keyed on an ancestor's state (`'@within card:hover'`)",
    rules: { Root: { opacity: 1, '@within card:hover': { opacity: 0.5 } } },
  },
  grid: {
    description: 'a typed web grid in a web block',
    rules: {
      // Named types, so the exported table can be declared (TS4023).
      Root: { '@platform web': { $grid: message as GridDefinition } },
      Avatar: {
        '@platform web': { $area: message.area('avatar') as GridArea },
      },
      Body: { '@platform web': { $area: message.area('body') as GridArea } },
    },
  },
  animation: {
    description: 'a declared animation',
    rules: { Root: { animation: 'fade-in' } },
  },
  'platform-blocks': {
    description: 'web and native platform blocks',
    rules: {
      Root: {
        '@platform web': { $style: { cursor: 'pointer' } },
        '@platform native': { $style: { opacity: 0.9 } },
      },
    },
  },
  'css-variable': {
    description: 'a declared external CSS variable (`--app-surface`)',
    rules: { Root: { bgColor: 'surface' } },
  },
  'web-rules': {
    description: 'a `$webRules` CSS extension in a web block',
    rules: {
      Root: {
        '@platform web': {
          $webRules: webRules({
            '&::before': { content: '"*"' },
          }) as WebRules,
        },
      },
    },
  },
} as const satisfies Record<string, DeclaredFeature>

/** The runtime half of each feature: its sheet, built by the target's system. */
const matrixFeatures: Record<string, Feature> = Object.fromEntries(
  Object.entries(features).map(([name, feature]: [string, DeclaredFeature]) => [
    name,
    {
      description: feature.description,
      sheet: (target: string) => {
        const system = systems[target as Name] as unknown as {
          stylesheet(rules: object): { variants(callback: unknown): object }
        }
        const sheet = system.stylesheet(feature.rules)
        return feature.variants ? sheet.variants(sizeVariants) : sheet
      },
      ...(feature.options ? { options: feature.options } : {}),
    },
  ]),
)

const here = fileURLToPath(import.meta.url)
const featureOf = (name: string): DeclaredFeature =>
  features[name as keyof typeof features]

export const runDeclaredSuite = () =>
  buildMatrix({
    features: matrixFeatures,
    targets,
    featuresModule: here,
    targetsModule: here,
    probeImports: (feature) => ({
      [here]: ['systems'],
      ...(featureOf(feature).variants
        ? { [join(here, '../../../index.ts')]: ['type Variants'] }
        : {}),
    }),
    probe: (feature, target) => {
      const definition = featureOf(feature)
      const at = `features[${JSON.stringify(feature)}]`
      const sheet = `systems[${JSON.stringify(target)}].stylesheet(${at}.rules)${definition.variants ? `.variants(${definition.variants})` : ''}`
      return `targets[${JSON.stringify(target)}](${sheet}${definition.options ? `, ${at}.options` : ''})`
    },
  })
