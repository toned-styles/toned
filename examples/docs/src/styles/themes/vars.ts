/**
 * Custom properties a component sets from its data. They are measurements,
 * not design values, so they are not theme fields.
 *
 * The build prefixes every custom property a token mentions with the system
 * id, so a property has two spellings: the one a token writes, and the one
 * that reaches the page, which is what a component sets.
 */
const property = (name: string) => ({
  inToken: `--${name}`,
  onElement: `--themes-${name}`,
})

/** A slider's value as a percentage: the track fills up to it. */
export const sliderValue = property('slider-value')
