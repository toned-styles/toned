import { useStyles } from '@toned/react'

import { themesPageStyles } from '../../styles/themes/page.ts'
import type { Theme } from '../../styles/themes/theme.ts'
import {
  defaultTheme,
  type ThemeName,
  themeList,
  themes,
} from '../../styles/themes/themes.ts'

const fields = Object.keys(themes[defaultTheme]) as (keyof Theme)[]
const label = (name: ThemeName) =>
  themeList.find((theme) => theme.id === name)?.label ?? name

/** The fields the active theme sets differently from the default theme. */
export function ThemeValues({ theme }: { theme: ThemeName }) {
  const s = useStyles(themesPageStyles, { selected: false })
  const base = themes[defaultTheme]
  const active = themes[theme]
  const shown =
    theme === defaultTheme
      ? fields
      : fields.filter((field) => active[field] !== base[field])
  return (
    <>
      <p {...s.LayerNote} data-testid="theme-difference">
        {theme === defaultTheme
          ? `${label(theme)} is the default theme. It supplies ${fields.length} values.`
          : `${label(theme)} gives ${shown.length} of ${fields.length} fields a different value from ${label(defaultTheme)}.`}
      </p>
      <div
        {...s.TableScroll}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- keyboard users must be able to scroll the table.
        tabIndex={0}
        role="region"
        aria-label={`${label(theme)} theme values`}
      >
        <table {...s.Table}>
          <thead>
            <tr>
              <th {...s.HeadCell} scope="col">
                Field
              </th>
              {theme !== defaultTheme && (
                <th {...s.HeadCell} scope="col">
                  {label(defaultTheme)}
                </th>
              )}
              <th {...s.HeadCell} scope="col">
                {label(theme)}
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((field) => (
              <tr key={field}>
                <th {...s.Field} scope="row">
                  {field}
                </th>
                {theme !== defaultTheme && <td {...s.Cell}>{base[field]}</td>}
                <td {...s.Cell}>{active[field]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
