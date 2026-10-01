import { createElements } from '@toned/react'
import {
  type FormEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  feedStyles,
  panelStyles,
  statStyles,
  tableStyles,
} from '../../styles/themes/sheets/content.ts'
import {
  dialogStyles,
  menuStyles,
  toastStyles,
} from '../../styles/themes/sheets/overlay.ts'
import {
  navStyles,
  shellStyles,
  sideItemStyles,
} from '../../styles/themes/sheets/shell.ts'
import type { ThemeName } from '../../styles/themes/themes.ts'
import {
  Avatar,
  AvatarGroup,
  Badge,
  Bars,
  Button,
  ChartAxis,
  Checkbox,
  FieldGrid,
  Meter,
  Segmented,
  SelectField,
  Slider,
  Switch,
  Tabs,
  TextField,
} from './controls.tsx'
import {
  activity,
  type Channel,
  channels,
  initialReleases,
  type ProjectId,
  people,
  projects,
  type Release,
  regions,
  stats,
  statusLabel,
  statusTone,
  weeklyDeploys,
} from './data.ts'

const Shell = createElements(shellStyles)
const Nav = createElements(navStyles)
const SideItem = createElements(sideItemStyles)
const Panel = createElements(panelStyles)
const Stat = createElements(statStyles)
const Table = createElements(tableStyles)
const Feed = createElements(feedStyles)
const Dialog = createElements(dialogStyles)
const Menu = createElements(menuStyles)
const Toast = createElements(toastStyles)

const areas = ['Projects', 'Team', 'Billing'] as const
const tabs = [
  { id: 'releases', label: 'Releases' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
] as const

type Settings = {
  name: string
  region: string
  channel: Channel
  notify: boolean
  autoDeploy: boolean
  rollout: number
}

const settingsFor = (project: ProjectId): Settings => ({
  name: projects.find((item) => item.id === project)?.name ?? '',
  region: regions[0],
  channel: 'Stable',
  notify: true,
  autoDeploy: false,
  rollout: initialReleases[project][0]?.rollout ?? 0,
})

const sameSettings = (a: Settings, b: Settings) =>
  (Object.keys(a) as (keyof Settings)[]).every((key) => a[key] === b[key])

/**
 * A release workspace. It has no notion of a theme: it renders parts, and the
 * `data-theme` attribute on its root decides what they look like.
 *
 * `compact` leaves out the sidebar, the people and the tabs, and shows the
 * heading, the figures and the releases table: enough for a preview.
 */
export function ReleaseApp({
  theme,
  compact = false,
}: {
  theme: ThemeName
  compact?: boolean
}) {
  const [area, setArea] = useState<(typeof areas)[number]>('Projects')
  const [project, setProject] = useState<ProjectId>('web')
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('releases')
  const [releases, setReleases] = useState(initialReleases)
  const [settings, setSettings] = useState(() => settingsFor('web'))
  const [toast, setToast] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)

  const set = <Key extends keyof Settings>(key: Key, value: Settings[Key]) =>
    setSettings((current) => ({ ...current, [key]: value }))

  function choose(next: ProjectId) {
    setProject(next)
    setSettings(settingsFor(next))
  }

  // The slider drives the newest release's rollout, so the table follows it.
  const rows = releases[project].map((release, index) =>
    index === 0 && release.status !== 'queued'
      ? { ...release, rollout: settings.rollout }
      : release,
  )

  return (
    <Shell.Stage data-theme={theme} data-testid="theme-stage">
      <Shell.Window>
        <Shell.TitleBar aria-hidden="true">
          <span>[■]</span>
          <span>C:\RELEASES\{project.toUpperCase()}.EXE</span>
          <span>[↕]</span>
        </Shell.TitleBar>
        <Shell.AppBar as="header">
          <Shell.Brand>
            <Shell.BrandMark aria-hidden="true" />
            <Shell.BrandName as="span">Slipway</Shell.BrandName>
          </Shell.Brand>
          <Shell.Nav as="nav" aria-label="Workspace">
            {areas.map((item) => (
              <Nav key={item} current={item === area}>
                <Nav.Link
                  as="button"
                  type="button"
                  aria-current={item === area ? 'page' : undefined}
                  onClick={() => setArea(item)}
                >
                  {item}
                </Nav.Link>
              </Nav>
            ))}
          </Shell.Nav>
          <UserMenu onAction={setToast} />
        </Shell.AppBar>

        <Shell.Body>
          {!compact && (
            <Shell.Sidebar as="aside" aria-label="Projects">
              <Shell.SideLabel as="span">Projects</Shell.SideLabel>
              <Shell.SideList as="ul">
                {projects.map((item) => (
                  <li key={item.id}>
                    <SideItem selected={item.id === project}>
                      <SideItem.Root
                        as="button"
                        type="button"
                        aria-current={item.id === project ? 'true' : undefined}
                        onClick={() => choose(item.id)}
                      >
                        <SideItem.Name as="span">{item.name}</SideItem.Name>
                        <SideItem.Count as="span">
                          {releases[item.id].length}
                        </SideItem.Count>
                      </SideItem.Root>
                    </SideItem>
                  </li>
                ))}
              </Shell.SideList>
            </Shell.Sidebar>
          )}

          <Shell.Main as="section" aria-label={`${settings.name} releases`}>
            {area === 'Projects' ? (
              <>
                <Shell.PageHead>
                  <Shell.Stack>
                    <Shell.Group>
                      <Shell.PageTitle as="h2">
                        {settings.name || 'Untitled'}
                      </Shell.PageTitle>
                      <Badge tone="neutral">{settings.channel}</Badge>
                    </Shell.Group>
                    <Shell.PageNote as="p">
                      {settings.region} · {rows.length} releases
                    </Shell.PageNote>
                  </Shell.Stack>
                  <Shell.Group>
                    {!compact && (
                      <Shell.Wide>
                        <AvatarGroup
                          names={['AK', 'MR', 'JL', '+3']}
                          label="Six people work on this project"
                        />
                      </Shell.Wide>
                    )}
                    <Button
                      tone="secondary"
                      onClick={() => setToast('Export queued')}
                    >
                      Export
                    </Button>
                    <Button onClick={() => dialog.current?.showModal()}>
                      New release
                    </Button>
                  </Shell.Group>
                </Shell.PageHead>

                <Shell.Stats>
                  {stats.map((stat) => (
                    <Stat.Root key={stat.label}>
                      <Stat.Label as="span">{stat.label}</Stat.Label>
                      <Stat.Row>
                        <Stat.Value as="span">{stat.value}</Stat.Value>
                        <Bars values={stat.trend} size="spark" />
                      </Stat.Row>
                      <Stat.Change>
                        <Badge tone={stat.tone}>{stat.change}</Badge>
                        <Stat.Note as="span">{stat.note}</Stat.Note>
                      </Stat.Change>
                    </Stat.Root>
                  ))}
                </Shell.Stats>

                {compact ? (
                  <Releases rows={rows} />
                ) : (
                  <Tabs
                    label="Project sections"
                    tabs={tabs}
                    value={tab}
                    onChange={setTab}
                  >
                    {tab === 'releases' && <Releases rows={rows} />}
                    {tab === 'activity' && <Activity />}
                    {tab === 'settings' && (
                      <SettingsForm
                        settings={settings}
                        set={set}
                        changed={!sameSettings(settings, settingsFor(project))}
                        onSave={() => setToast('Settings saved')}
                        onReset={() => setSettings(settingsFor(project))}
                        onDelete={() =>
                          setToast('Deleting is turned off in this demo')
                        }
                      />
                    )}
                  </Tabs>
                )}
              </>
            ) : (
              <Panel.Root>
                <Panel.Head>
                  <Panel.Title as="h2">{area}</Panel.Title>
                </Panel.Head>
                <Panel.Body>
                  <p>This demo has content under Projects only.</p>
                </Panel.Body>
              </Panel.Root>
            )}

            <Toast.Dock role="status" aria-live="polite">
              {toast && (
                <Toast.Root data-testid="theme-toast">
                  <Toast.Mark aria-hidden="true" />
                  <Toast.Text as="span">{toast}</Toast.Text>
                  <Button
                    tone="quiet"
                    shape="icon"
                    aria-label="Dismiss"
                    onClick={() => setToast('')}
                  >
                    <CloseIcon />
                  </Button>
                </Toast.Root>
              )}
            </Toast.Dock>
          </Shell.Main>
        </Shell.Body>

        <Shell.StatusBar aria-hidden="true">
          <span>
            <Shell.Key as="span">F1</Shell.Key> Help
          </span>
          <span>
            <Shell.Key as="span">F2</Shell.Key> Save
          </span>
          <span>
            <Shell.Key as="span">F9</Shell.Key> Deploy
          </span>
          <span>
            <Shell.Key as="span">Alt-X</Shell.Key> Exit
          </span>
        </Shell.StatusBar>
      </Shell.Window>

      <NewRelease
        dialog={dialog}
        onCreate={(release) => {
          setReleases((current) => ({
            ...current,
            [project]: [release, ...current[project]],
          }))
          set('rollout', release.rollout)
          setTab('releases')
          setToast(`Release ${release.version} created`)
        }}
      />
    </Shell.Stage>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2 2l8 8M10 2l-8 8"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )
}

function Releases({ rows }: { rows: Release[] }) {
  return (
    <Panel.Root>
      <Table.Scroll>
        <Table.Table as="table">
          <thead>
            <tr>
              <Table.HeadCell as="th" scope="col">
                Version
              </Table.HeadCell>
              <Table column="wide">
                <Table.HeadCell as="th" scope="col">
                  Branch
                </Table.HeadCell>
              </Table>
              <Table.HeadCell as="th" scope="col">
                Status
              </Table.HeadCell>
              <Table column="wide">
                <Table.HeadCell as="th" scope="col">
                  Owner
                </Table.HeadCell>
              </Table>
              <Table.HeadCell as="th" scope="col">
                Rollout
              </Table.HeadCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((release, index) => (
              // Counted from the oldest, so a new first row keeps the others' keys.
              <Table.Row as="tr" key={rows.length - index}>
                <Table.Cell as="td">
                  <Table.Version as="span">{release.version}</Table.Version>
                </Table.Cell>
                <Table column="wide">
                  <Table.Cell as="td">
                    <Table.Branch as="span">{release.branch}</Table.Branch>
                  </Table.Cell>
                </Table>
                <Table.Cell as="td">
                  <Badge tone={statusTone[release.status]}>
                    {statusLabel[release.status]}
                  </Badge>
                </Table.Cell>
                <Table column="wide">
                  <Table.Cell as="td">
                    <Table.Owner>
                      <Avatar name={release.owner} />
                      {people[release.owner]}
                    </Table.Owner>
                  </Table.Cell>
                </Table>
                <Table.Cell as="td">
                  <Table.Rollout>
                    <Table.Gauge>
                      <Meter
                        value={release.rollout}
                        label={`Rollout of ${release.version}`}
                      />
                    </Table.Gauge>
                    <Table.Percent as="span">{release.rollout}%</Table.Percent>
                  </Table.Rollout>
                </Table.Cell>
              </Table.Row>
            ))}
          </tbody>
        </Table.Table>
      </Table.Scroll>
    </Panel.Root>
  )
}

function Activity() {
  return (
    <>
      <Panel.Root>
        <Panel.Head>
          <Panel.Title as="h3">Deploys per week</Panel.Title>
          <Badge tone="ok">12 weeks</Badge>
        </Panel.Head>
        <Panel.Body>
          <Shell.Stack>
            <Bars
              values={weeklyDeploys}
              label={`Deploys per week over twelve weeks, rising from ${weeklyDeploys[0]} to ${weeklyDeploys.at(-1)}`}
            />
            <ChartAxis aria-hidden="true">
              <span>12 weeks ago</span>
              <span>This week</span>
            </ChartAxis>
          </Shell.Stack>
        </Panel.Body>
      </Panel.Root>
      <Panel.Root>
        <Panel.Head>
          <Panel.Title as="h3">Recent activity</Panel.Title>
        </Panel.Head>
        <Feed.List as="ul">
          {activity.map((item, index) => (
            <Feed key={item.text} first={index === 0}>
              <Feed.Item as="li">
                <Feed.Entry>
                  <Avatar name={item.who} />
                  <span>{item.text}</span>
                </Feed.Entry>
                <Feed.Time as="span">{item.when}</Feed.Time>
              </Feed.Item>
            </Feed>
          ))}
        </Feed.List>
      </Panel.Root>
    </>
  )
}

function SettingsForm({
  settings,
  set,
  changed,
  onSave,
  onReset,
  onDelete,
}: {
  settings: Settings
  /** Whether anything differs from the project's saved settings. */
  changed: boolean
  set: <Key extends keyof Settings>(key: Key, value: Settings[Key]) => void
  onSave: () => void
  onReset: () => void
  onDelete: () => void
}) {
  return (
    <Panel.Root>
      <Panel.Head>
        <Panel.Title as="h3">Project settings</Panel.Title>
      </Panel.Head>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <Panel.Body>
          <FieldGrid>
            <TextField
              label="Project name"
              hint="Shown in the page heading."
              value={settings.name}
              onChange={(value) => set('name', value)}
            />
            <SelectField
              label="Region"
              value={settings.region}
              options={regions}
              onChange={(value) => set('region', value)}
            />
            <Segmented
              label="Release channel"
              options={channels}
              value={settings.channel}
              onChange={(value) => set('channel', value)}
            />
            <Slider
              label="Rollout of the newest release"
              value={settings.rollout}
              onChange={(value) => set('rollout', value)}
            />
          </FieldGrid>
          <Shell.Options>
            <Checkbox
              checked={settings.notify}
              onChange={(value) => set('notify', value)}
            >
              Email me when a release fails
            </Checkbox>
            <Switch
              on={settings.autoDeploy}
              onChange={(value) => set('autoDeploy', value)}
            >
              Deploy on merge
            </Switch>
          </Shell.Options>
        </Panel.Body>
        <Panel.Foot>
          <Button tone="danger" onClick={onDelete}>
            Delete project
          </Button>
          <Shell.Group>
            <Button tone="secondary" disabled={!changed} onClick={onReset}>
              Reset
            </Button>
            <Button type="submit">Save changes</Button>
          </Shell.Group>
        </Panel.Foot>
      </form>
    </Panel.Root>
  )
}

function UserMenu({ onAction }: { onAction: (message: string) => void }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const items = ['Profile', 'Notifications', 'Sign out']

  useEffect(() => {
    if (!open) return
    anchor.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const outside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  function close(refocus: boolean) {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }

  return (
    <Menu.Anchor
      as="div"
      ref={anchor}
      onKeyDown={(event) => {
        if (!open) return
        const options = [
          ...(anchor.current?.querySelectorAll<HTMLElement>(
            '[role="menuitem"]',
          ) ?? []),
        ]
        const index = options.indexOf(document.activeElement as HTMLElement)
        if (event.key === 'Escape') close(true)
        else if (event.key === 'Tab') setOpen(false)
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const step = event.key === 'ArrowDown' ? 1 : -1
          options[(index + step + options.length) % options.length]?.focus()
        }
      }}
    >
      <Menu.Trigger
        as="button"
        type="button"
        ref={trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label="Account menu for Ada King"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name="AK" />
      </Menu.Trigger>
      {open && (
        <Menu.Menu role="menu" id={id} aria-label="Account">
          <Menu.Label role="presentation">
            <Menu.Name as="span">Ada King</Menu.Name>
            <Menu.Detail as="span">Owner of 3 projects</Menu.Detail>
          </Menu.Label>
          {items.map((item) => (
            <Menu.Item
              as="button"
              type="button"
              role="menuitem"
              tabIndex={-1}
              key={item}
              onClick={() => {
                close(true)
                onAction(`${item} is not part of this demo`)
              }}
            >
              {item}
            </Menu.Item>
          ))}
        </Menu.Menu>
      )}
    </Menu.Anchor>
  )
}

function NewRelease({
  dialog,
  onCreate,
}: {
  dialog: RefObject<HTMLDialogElement | null>
  onCreate: (release: Release) => void
}) {
  const [version, setVersion] = useState('4.13.0')
  const [start, setStart] = useState<'Queued' | '10%' | '50%'>('10%')
  const titleId = useId()

  function submit(event: FormEvent) {
    event.preventDefault()
    const rollout = start === 'Queued' ? 0 : Number.parseInt(start, 10)
    onCreate({
      version: version.trim(),
      branch: 'main',
      status: rollout ? 'rolling' : 'queued',
      owner: 'AK',
      rollout,
    })
    dialog.current?.close()
  }

  return (
    <Dialog.Root as="dialog" ref={dialog} aria-labelledby={titleId}>
      <Dialog.Form as="form" onSubmit={submit}>
        <Dialog.Head>
          <Dialog.Title as="h2" id={titleId}>
            New release
          </Dialog.Title>
          <Button
            tone="quiet"
            shape="icon"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
          >
            <CloseIcon />
          </Button>
        </Dialog.Head>
        <Dialog.Body>
          <TextField
            label="Version"
            hint="It is added to the top of the table."
            value={version}
            onChange={setVersion}
            required
          />
          <Segmented
            label="Start the rollout at"
            options={['Queued', '10%', '50%'] as const}
            value={start}
            onChange={setStart}
          />
        </Dialog.Body>
        <Dialog.Foot>
          <Button tone="secondary" onClick={() => dialog.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" disabled={!version.trim()}>
            Create release
          </Button>
        </Dialog.Foot>
      </Dialog.Form>
    </Dialog.Root>
  )
}
