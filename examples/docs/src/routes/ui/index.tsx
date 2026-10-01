import { createFileRoute, Link } from '@tanstack/react-router'
import { overrideStyles, StyleOverrides, useStyles } from '@toned/react'
import { useMemo, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
} from '../../../../ui/src/components/ui/avatar.tsx'
import { Badge } from '../../../../ui/src/components/ui/badge.tsx'
import {
  Button,
  buttonStyles,
} from '../../../../ui/src/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../../ui/src/components/ui/card.tsx'
import { Checkbox } from '../../../../ui/src/components/ui/checkbox.tsx'
import { Input } from '../../../../ui/src/components/ui/input.tsx'
import { Label } from '../../../../ui/src/components/ui/label.tsx'
import { Progress } from '../../../../ui/src/components/ui/progress.tsx'
import { Separator } from '../../../../ui/src/components/ui/separator.tsx'
import { Switch } from '../../../../ui/src/components/ui/switch.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../../ui/src/components/ui/tabs.tsx'
import { componentNames } from '../../lib/component-registry.ts'
import { libraryStyles } from '../../styles/library.ts'
import { playgroundStyles } from '../../styles/playground.ts'
import { docsStyles } from '../../styles/site.ts'

export const Route = createFileRoute('/ui/')({ component: LibraryShowcase })
const tasks = [
  'Design tokens connected',
  'Keyboard interactions checked',
  'Ready for the world',
]
const initialMembers = ['Alex Morgan', 'Sam Rivera', 'Jordan Lee']
const seats = 6
const pages = [
  ['button', 'Button', 'Six appearances and eight sizes in one stylesheet.'],
  ['card', 'Card', 'Density and surface variants across seven parts.'],
  ['dialog', 'Dialog', 'A modal with focus handling and an exit animation.'],
  ['select', 'Select', 'A styled list of options with keyboard support.'],
] as const

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function LibraryShowcase() {
  const s = useStyles(libraryStyles)
  const p = useStyles(playgroundStyles)
  const d = useStyles(docsStyles)
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    'comfortable',
  )
  const [rounded, setRounded] = useState(false)
  const [done, setDone] = useState([true, true, false])
  const [notifications, setNotifications] = useState(true)
  const [members, setMembers] = useState(initialMembers)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const completed = done.filter(Boolean).length
  const overrides = useMemo(
    () => [
      overrideStyles(buttonStyles, {
        root: { borderRadius: rounded ? 'full' : 'medium' },
      }),
    ],
    [rounded],
  )

  return (
    <div {...s.stack}>
      <div>
        <p {...d.Breadcrumb}>Components</p>
        <h1 {...d.Title}>Component gallery</h1>
        <p {...d.Lead}>
          {componentNames.length} components built with Toned. The demo below
          uses several of them together; open any component to read its
          stylesheet and edit it live.
        </p>
      </div>
      <p {...p.note}>
        The theme switcher above shows the whole collection in six themes. The
        components and their stylesheets are the same in each one. A stylesheet
        names tokens, the tokens read CSS variables, and a theme is one set of
        values for those variables, selected by a <code>data-theme</code>{' '}
        attribute. Switching rerenders no component and changes no class.
      </p>
      <div {...p.stage} data-gallery-stage data-gallery-themed>
        <div {...s.spread}>
          <span {...s.muted}>
            The demo is interactive. Changes stay in this browser session.
          </span>
          <div {...s.row} role="group" aria-label="Showcase appearance">
            <Button
              size="sm"
              variant={density === 'compact' ? 'secondary' : 'outline'}
              aria-pressed={density === 'compact'}
              onClick={() =>
                setDensity(density === 'compact' ? 'comfortable' : 'compact')
              }
            >
              Compact cards
            </Button>
            <Button
              size="sm"
              variant={rounded ? 'secondary' : 'outline'}
              aria-pressed={rounded}
              onClick={() => setRounded(!rounded)}
            >
              Rounded buttons
            </Button>
          </div>
        </div>
        <StyleOverrides value={overrides}>
          <section
            {...s.panel}
            aria-label="Orbit workspace demo"
            data-gallery-panel
          >
            <div {...s.spread}>
              <div {...s.person}>
                <Avatar size="lg">
                  <AvatarFallback>OW</AvatarFallback>
                </Avatar>
                <div>
                  <p {...s.muted}>Orbit workspace</p>
                  <h2 {...s.heading} data-gallery-title>
                    Release 2.4
                  </h2>
                </div>
              </div>
              <Badge
                variant={completed === tasks.length ? 'default' : 'secondary'}
              >
                {completed === tasks.length ? 'Ready to launch' : 'In progress'}
              </Badge>
            </div>
            <Tabs defaultValue="overview">
              <TabsList aria-label="Workspace views">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="team">Team & settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <div {...s.grid}>
                  <Card density={density}>
                    <CardHeader>
                      <CardDescription>Activity this week</CardDescription>
                      <CardTitle>38 changes merged</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div {...s.stack}>
                        <svg
                          {...s.chart}
                          viewBox="0 0 480 150"
                          role="img"
                          aria-labelledby="momentum-title"
                        >
                          <title id="momentum-title">
                            Illustrative activity trend rising over seven days
                          </title>
                          <defs>
                            <linearGradient
                              id="momentum-fill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="currentColor"
                                stopOpacity="0.2"
                              />
                              <stop
                                offset="100%"
                                stopColor="currentColor"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M0 130H480M0 80H480M0 30H480"
                            stroke="currentColor"
                            opacity="0.12"
                          />
                          <path
                            d="M0 120C40 120 40 100 80 100S120 130 160 95S200 70 240 78S280 40 320 55S360 75 400 35S450 25 480 12V150H0Z"
                            fill="url(#momentum-fill)"
                          />
                          <path
                            d="M0 120C40 120 40 100 80 100S120 130 160 95S200 70 240 78S280 40 320 55S360 75 400 35S450 25 480 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                        </svg>
                        <div {...s.spread}>
                          <span {...s.muted}>Mon</span>
                          <span {...s.muted}>Sun · illustrative data</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to="/ui/$component"
                          params={{ component: 'card' }}
                        >
                          Open the card stylesheet
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                  <Card density={density} appearance="soft">
                    <CardHeader>
                      <CardDescription>Release checklist</CardDescription>
                      <CardTitle>
                        {completed} of {tasks.length} milestones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div {...s.stack}>
                        <Progress
                          value={completed}
                          max={tasks.length}
                          aria-label="Release milestones"
                        />
                        {tasks.map((task, index) => (
                          <div key={task} {...s.check}>
                            <Checkbox
                              id={`milestone-${index}`}
                              checked={done[index]}
                              onCheckedChange={(value) =>
                                setDone((previous) =>
                                  previous.map((checked, position) =>
                                    position === index
                                      ? value === true
                                      : checked,
                                  ),
                                )
                              }
                            />
                            <Label htmlFor={`milestone-${index}`}>{task}</Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => setDone([true, true, true])}
                        disabled={completed === tasks.length}
                      >
                        {completed === tasks.length
                          ? 'All systems ready ✓'
                          : 'Complete release checks'}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="team">
                <div {...s.grid}>
                  <Card density={density}>
                    <CardHeader>
                      <CardTitle>Team</CardTitle>
                      <CardDescription>
                        People who can publish this release.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div {...s.stack}>
                        {members.map((member, index) => (
                          <div key={member} {...s.spread}>
                            <div {...s.person}>
                              <Avatar>
                                <AvatarFallback>
                                  {initials(member)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{member}</span>
                            </div>
                            <Badge
                              variant={index === 0 ? 'secondary' : 'outline'}
                            >
                              {index === 0 ? 'Owner' : 'Member'}
                            </Badge>
                          </div>
                        ))}
                        <Separator />
                        <form
                          {...s.stack}
                          onSubmit={(event) => {
                            event.preventDefault()
                            const value = name.trim()
                            if (!value) return
                            if (members.includes(value)) {
                              setMessage('Already part of this team.')
                              return
                            }
                            if (members.length >= seats) return
                            setMembers([...members, value])
                            setName('')
                            setMessage(`${value} added to the demo team.`)
                          }}
                        >
                          <Label htmlFor="demo-member">Add a teammate</Label>
                          <div {...s.row}>
                            <Input
                              id="demo-member"
                              value={name}
                              maxLength={40}
                              placeholder="Teammate’s name"
                              onChange={(event) => setName(event.target.value)}
                            />
                            <Button
                              type="submit"
                              disabled={members.length >= seats || !name.trim()}
                            >
                              {members.length >= seats
                                ? 'Demo team is full'
                                : 'Add to demo team'}
                            </Button>
                          </div>
                          <p {...s.muted} role="status">
                            {message ||
                              'Local demo only. No invitations are sent.'}
                          </p>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                  <Card density={density} appearance="outline">
                    <CardHeader>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>
                        Choose which updates this workspace sends.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div {...s.stack}>
                        <div {...s.spread}>
                          <Label htmlFor="demo-notifications">
                            Release notifications
                          </Label>
                          <Switch
                            id="demo-notifications"
                            checked={notifications}
                            onCheckedChange={setNotifications}
                          />
                        </div>
                        <p {...s.muted}>
                          {notifications
                            ? 'Release updates are shown in this demo.'
                            : 'Release updates are turned off.'}
                        </p>
                        <Separator />
                        <Progress
                          value={members.length}
                          max={seats}
                          size="sm"
                          aria-label="Demo team seats"
                        />
                        <p {...s.muted}>
                          {members.length} of {seats} demo seats used
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to="/ui/$component"
                          params={{ component: 'switch' }}
                        >
                          Open the switch stylesheet
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </StyleOverrides>
      </div>
      <section {...s.grid} aria-label="Component pages to start with">
        {pages.map(([component, title, body]) => (
          <Link
            key={component}
            to="/ui/$component"
            params={{ component }}
            {...s.cardLink}
          >
            <h2 {...s.cardLinkTitle}>{title}</h2>
            <p {...s.muted}>{body}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
