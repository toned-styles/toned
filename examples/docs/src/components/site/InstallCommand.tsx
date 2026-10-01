import { useStyles } from '@toned/react'
import { experimentStyles } from '../../styles/site.ts'
import { type LayerFile, LayerSource } from '../lab/LayerSource.tsx'

const managers = [
  ['npm', 'npm install'],
  ['pnpm', 'pnpm add'],
  ['yarn', 'yarn add'],
  ['bun', 'bun add'],
] as const

/** The install command for the given packages, one tab per package manager. */
export function InstallCommand({
  packages,
  id = 'install',
}: {
  /** Package names, separated by spaces. */
  packages: string
  /** Distinguishes two commands on one page. */
  id?: string
}) {
  const files: LayerFile[] = managers.map(([name, command]) => ({
    layer: name,
    file: 'Terminal',
    source: `${command} ${packages}`,
    lang: 'sh',
  }))
  const s = useStyles(experimentStyles)
  return (
    <div {...s.Inline}>
      <LayerSource id={id} label="Package manager" files={files} />
    </div>
  )
}
