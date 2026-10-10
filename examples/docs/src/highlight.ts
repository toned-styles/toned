import { createHighlighterCoreSync, type ThemeRegistration } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import bash from 'shiki/langs/bash.mjs'
import css from 'shiki/langs/css.mjs'
import json from 'shiki/langs/json.mjs'
import tsx from 'shiki/langs/tsx.mjs'

import { brand } from './styles/brand.ts'

export type CodeLanguage = 'bash' | 'css' | 'json' | 'tsx'

/**
 * Syntax colours shared by every code surface: the Shiki theme below and the
 * playground's CodeMirror highlight style read the same values.
 */
export const codeColors = {
  comment: '#8a93ad',
  keyword: '#7a3fc4',
  string: '#0f7a62',
  constant: '#b4531c',
  function: brand.blue,
  type: '#a1336f',
  tag: '#1f6fb2',
  attribute: '#3d4fb8',
  punctuation: '#5d6784',
} as const

/** The site's own code theme, drawn from the brand palette. */
const tonedLight: ThemeRegistration = {
  name: 'toned-light',
  type: 'light',
  fg: brand.codeInk,
  bg: brand.codeBg,
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: codeColors.comment, fontStyle: 'italic' },
    },
    {
      scope: [
        'keyword',
        'storage',
        'storage.type',
        'storage.modifier',
        'keyword.operator.new',
        'keyword.operator.expression',
        'keyword.control',
      ],
      settings: { foreground: codeColors.keyword },
    },
    {
      scope: ['string', 'string.template', 'punctuation.definition.string'],
      settings: { foreground: codeColors.string },
    },
    {
      scope: [
        'constant.numeric',
        'constant.language',
        'support.constant',
        'constant.other',
      ],
      settings: { foreground: codeColors.constant },
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: codeColors.function },
    },
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'support.type',
        'support.class',
        'entity.other.inherited-class',
      ],
      settings: { foreground: codeColors.type },
    },
    {
      scope: ['entity.name.tag', 'support.class.component'],
      settings: { foreground: codeColors.tag },
    },
    {
      scope: ['entity.other.attribute-name', 'support.type.property-name'],
      settings: { foreground: codeColors.attribute },
    },
    {
      scope: ['variable.parameter', 'variable.other.constant'],
      settings: { foreground: '#24305a' },
    },
    {
      scope: ['keyword.operator', 'punctuation', 'meta.brace'],
      settings: { foreground: codeColors.punctuation },
    },
    {
      scope: ['variable.other.readwrite.alias', 'variable.other.object'],
      settings: { foreground: brand.codeInk },
    },
    // Shell: the command itself reads as a function, flags as parameters.
    {
      scope: ['entity.name.command', 'support.function.builtin.shell'],
      settings: { foreground: codeColors.function },
    },
  ],
}

// Synchronous so prerendered HTML ships already highlighted: no flash of plain
// code, and the client's first render matches the server byte for byte. Only
// the grammars the site uses are bundled.
const highlighter = createHighlighterCoreSync({
  themes: [tonedLight],
  langs: [bash, css, json, tsx],
  engine: createJavaScriptRegexEngine(),
})

const aliases: Record<string, CodeLanguage> = {
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  css: 'css',
  json: 'json',
  jsonc: 'json',
  js: 'tsx',
  jsx: 'tsx',
  mjs: 'tsx',
  ts: 'tsx',
  tsx: 'tsx',
  typescript: 'tsx',
  javascript: 'tsx',
}

const shellCommand =
  /^(\$ |git |cd |pnpm |npm |npx |bun |bunx |yarn |node |mise |brew |curl |code |echo )/

/** Maps a fence label to a grammar, or infers one from the code itself. */
export function resolveLanguage(code: string, lang?: string): CodeLanguage {
  const alias = lang ? aliases[lang.toLowerCase()] : undefined
  if (alias) return alias
  const first = code.trimStart()
  if (shellCommand.test(first)) return 'bash'
  if (/^[[{]/.test(first)) {
    try {
      JSON.parse(first)
      return 'json'
    } catch {
      // Object literals and arrays of code fall through to TypeScript.
    }
  }
  if (
    /^(:root|@media|@layer|@import|\.[\w-]+\s*\{|\[data-)/.test(first) &&
    !/\b(import|export|const)\b/.test(first)
  )
    return 'css'
  return 'tsx'
}

export const languageLabel: Record<CodeLanguage, string> = {
  bash: 'Terminal',
  css: 'CSS',
  json: 'JSON',
  tsx: 'TypeScript',
}

export function highlight(code: string, lang: CodeLanguage) {
  return highlighter.codeToTokens(code, {
    lang,
    theme: 'toned-light',
    // Shiki stops tokenizing a line after 500 ms and returns the rest as plain
    // text. On a slow or busy device that changes the markup, which no longer
    // matches the prerendered page. The snippets here are short and fixed.
    tokenizeTimeLimit: 0,
  })
}
