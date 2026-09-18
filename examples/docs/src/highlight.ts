import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import bash from 'shiki/langs/bash.mjs'
import css from 'shiki/langs/css.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import githubLight from 'shiki/themes/github-light.mjs'

export type CodeLanguage = 'bash' | 'css' | 'tsx'

// This module is loaded only when a code block mounts. Keep the public docs'
// three languages explicit instead of bundling Shiki's entire grammar registry.
const highlighter = createHighlighterCore({
  themes: [githubLight],
  langs: [bash, css, tsx],
  engine: createJavaScriptRegexEngine(),
})

export async function highlight(code: string, lang: CodeLanguage) {
  return (await highlighter).codeToTokens(code, { lang, theme: 'github-light' })
}
