import { createElements, useStyles } from '@toned/react'
import { themesPageStyles } from '../../styles/themes/page.ts'
import { swatchStyles } from '../../styles/themes/sheets/swatch.ts'
import { type ThemeName, themeList } from '../../styles/themes/themes.ts'
import { useRoving } from './controls.tsx'

const Swatch = createElements(swatchStyles)

function Option({
  theme,
  selected,
  onSelect,
  roving,
}: {
  theme: (typeof themeList)[number]
  selected: boolean
  onSelect: () => void
  roving: ReturnType<ReturnType<typeof useRoving<ThemeName>>>
}) {
  const s = useStyles(themesPageStyles, { selected })
  return (
    <button
      {...s.Option.withProps<'button'>({
        type: 'button',
        role: 'radio',
        'aria-checked': selected,
        onClick: onSelect,
        ...roving,
      })}
      data-theme-option={theme.id}
    >
      {/* Each swatch sits in its own theme scope, so it previews that theme. */}
      <Swatch.Root as="span" data-theme={theme.id} aria-hidden="true">
        <Swatch.Sample as="span">Aa</Swatch.Sample>
        <Swatch.Accent as="span" />
      </Swatch.Root>
      {theme.label}
    </button>
  )
}

export function ThemeSwitcher({
  value,
  onChange,
}: {
  value: ThemeName
  onChange: (theme: ThemeName) => void
}) {
  const s = useStyles(themesPageStyles, { selected: false })
  const roving = useRoving(
    themeList.map((theme) => theme.id),
    value,
    onChange,
  )
  return (
    <>
      <div {...s.Switcher} role="radiogroup" aria-label="Theme">
        {themeList.map((theme) => (
          <Option
            key={theme.id}
            theme={theme}
            selected={theme.id === value}
            onSelect={() => onChange(theme.id)}
            roving={roving(theme.id)}
          />
        ))}
      </div>
      <p {...s.Note} aria-live="polite">
        {themeList.find((theme) => theme.id === value)?.note}
      </p>
    </>
  )
}
