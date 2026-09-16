import { defineToken } from '../defineCssToken.ts'
import { typo } from './typo.ts'

/** Semantic role names; legacy theme storage keeps its existing variable keys. */
export const typography = defineToken({
  values: [
    'display-large', 'display-medium', 'display-small',
    'heading-1', 'heading-2', 'heading-3', 'heading-4',
    'body-large', 'body-medium', 'body-small',
    'label-large', 'label-medium', 'label-small', 'code', 'quote', 'caption',
  ],
  resolve: (value, tokens) => typo.resolve(value.replaceAll('-', '_') as typeof typo.values[number], tokens),
})
