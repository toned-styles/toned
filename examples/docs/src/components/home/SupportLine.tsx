import { useStyles } from '@toned/react'
import { homeStyles } from '../../styles/home.ts'

/**
 * What exists today, each item labelled by what it is. The only framework
 * binding is `@toned/react`; other frameworks use the core renderer directly,
 * and the line says so rather than naming them as integrations.
 */
const supported = [
  { kind: 'Binding', name: 'React' },
  { kind: 'Binding', name: 'React Native' },
  { kind: 'Binding', name: 'React Server Components' },
  { kind: 'Output', name: 'Web CSS, built ahead of time' },
  { kind: 'Output', name: 'SSR and static HTML' },
  { kind: 'Output', name: 'Inline styles for HTML email' },
  { kind: 'Output', name: 'PDF style profile' },
  { kind: 'Backend', name: 'Tailwind' },
  { kind: 'Build', name: 'Vite plugin' },
  { kind: 'Tokens', name: 'DTCG import and export' },
  { kind: 'Editor', name: 'Language server' },
  { kind: 'Editor', name: 'VS Code extension' },
  { kind: 'Lint', name: 'ESLint and Oxlint rules' },
  {
    kind: 'Core',
    name: 'Other frameworks',
    note: 'through the core renderer; no binding package',
  },
] as const

function Items({ hidden }: { hidden?: boolean }) {
  const s = useStyles(homeStyles)
  return (
    <ul aria-hidden={hidden ? 'true' : undefined}>
      {supported.map((item) => (
        <li key={item.name} {...s.Chip}>
          <span {...s.ChipKind}>{item.kind}</span>
          <span {...s.ChipName}>{item.name}</span>
          {'note' in item ? <span {...s.ChipNote}>{item.note}</span> : null}
        </li>
      ))}
    </ul>
  )
}

export function SupportLine() {
  const s = useStyles(homeStyles)
  return (
    <div {...s.Support}>
      <p id="support-label" {...s.SupportLabel}>
        Available today
      </p>
      <section
        className="tnd-marquee"
        aria-labelledby="support-label"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: focus pauses the moving line for keyboard users.
        tabIndex={0}
      >
        <div className="tnd-marquee-track">
          <Items />
          <Items hidden />
        </div>
      </section>
    </div>
  )
}
