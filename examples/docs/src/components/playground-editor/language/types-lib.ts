/**
 * TypeScript's own lib declarations for ES2022 + DOM, as text. Imported only
 * by the language worker, so they form a chunk fetched on `/playground`.
 */
const sources = import.meta.glob<string>(
  '../../../../node_modules/typescript/lib/lib.{es5,es2015,es2015.*,es2016,es2016.*,es2017,es2017.*,es2018,es2018.*,es2019,es2019.*,es2020,es2020.*,es2021,es2021.*,es2022,es2022.*,dom,dom.iterable,dom.asynciterable,decorators,decorators.legacy}.d.ts',
  { query: '?raw', import: 'default', eager: true },
)

/** Virtual path (`/lib/lib.es5.d.ts`) to declaration text. */
export const files: Record<string, string> = Object.fromEntries(
  Object.entries(sources).map(([path, text]) => [
    `/lib/${path.slice(path.lastIndexOf('/') + 1)}`,
    text,
  ]),
)
