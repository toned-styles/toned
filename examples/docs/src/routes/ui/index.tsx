import { createFileRoute, Link } from '@tanstack/react-router'
import { overrideStyles, StyleOverrides, useStyles } from '@toned/react'
import { useMemo, useState } from 'react'
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
import { Progress } from '../../../../ui/src/components/ui/progress.tsx'
import { Switch } from '../../../../ui/src/components/ui/switch.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../../ui/src/components/ui/tabs.tsx'
import { libraryStyles } from '../../styles/library.ts'
import { docsStyles } from '../../styles/site.ts'

export const Route = createFileRoute('/ui/')({ component: LibraryShowcase })
const tasks = [
  'Design tokens connected',
  'Keyboard interactions checked',
  'Ready for the world',
]
const initialMembers = ['Alex Morgan', 'Sam Rivera', 'Jordan Lee']

function LibraryShowcase() {
  const s = useStyles(libraryStyles)
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
          Fifty-six components built with Toned. The demo below uses several of
          them together; open any component to read its stylesheet and edit it
          live.
        </p>
      </div>
      <div {...s.spread}>
        <div {...s.row}>
          <Badge variant="outline">Interactive example</Badge>
          <span {...s.muted}>Changes stay in this browser session.</span>
        </div>
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
        <section {...s.panel} aria-label="Orbit workspace demo">
          <div {...s.spread}>
            <div {...s.stack}>
              <p {...s.eyebrow}>◒ Orbit / Workspace</p>
              <h2>Release 2.4</h2>
            </div>
            <Badge>
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
                    <CardDescription>Weekly momentum</CardDescription>
                    <CardTitle {...s.metric}>On track</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div {...s.stack}>
                      <svg
                        viewBox="0 0 480 150"
                        width="100%"
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
                              stopColor="#6464ec"
                              stopOpacity="0.24"
                            />
                            <stop
                              offset="100%"
                              stopColor="#6464ec"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 130H480M0 80H480M0 30H480"
                          stroke="currentColor"
                          opacity="0.08"
                        />
                        <path
                          d="M0 120C40 120 40 100 80 100S120 130 160 95S200 70 240 78S280 40 320 55S360 75 400 35S450 25 480 12V150H0Z"
                          fill="url(#momentum-fill)"
                        />
                        <path
                          d="M0 120C40 120 40 100 80 100S120 130 160 95S200 70 240 78S280 40 320 55S360 75 400 35S450 25 480 12"
                          fill="none"
                          stroke="#6464ec"
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
                    <Link to="/ui/$component" params={{ component: 'card' }}>
                      Inspect card stylesheet ↗
                    </Link>
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
                        <label
                          key={task}
                          htmlFor={`milestone-${index}`}
                          {...s.row}
                        >
                          <Checkbox
                            id={`milestone-${index}`}
                            checked={done[index]}
                            onCheckedChange={(value) =>
                              setDone((previous) =>
                                previous.map((checked, position) =>
                                  position === index ? value === true : checked,
                                ),
                              )
                            }
                          />
                          {task}
                        </label>
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
                    <CardTitle>Better together.</CardTitle>
                    <CardDescription>
                      A tiny team with a big idea.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div {...s.stack}>
                      {members.map((member, index) => (
                        <div key={member} {...s.spread}>
                          <span>{member}</span>
                          <Badge variant="secondary">
                            {index === 0 ? 'Owner' : 'Member'}
                          </Badge>
                        </div>
                      ))}
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
                          if (members.length >= 6) return
                          setMembers([...members, value])
                          setName('')
                          setMessage(`${value} added to the demo team.`)
                        }}
                      >
                        <label htmlFor="demo-member" {...s.label}>
                          Add a teammate
                        </label>
                        <Input
                          id="demo-member"
                          value={name}
                          maxLength={40}
                          placeholder="Teammate’s name"
                          onChange={(event) => setName(event.target.value)}
                        />
                        <Button
                          type="submit"
                          disabled={members.length >= 6 || !name.trim()}
                        >
                          {members.length >= 6
                            ? 'Demo team is full'
                            : 'Add to demo team'}
                        </Button>
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
                    <CardTitle>A little less noise.</CardTitle>
                    <CardDescription>
                      Preferences that feel like part of the product.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div {...s.stack}>
                      <div {...s.spread}>
                        <label htmlFor="demo-notifications">
                          Release notifications
                        </label>
                        <Switch
                          id="demo-notifications"
                          checked={notifications}
                          onCheckedChange={setNotifications}
                        />
                      </div>
                      <p {...s.muted}>
                        {notifications
                          ? 'You’ll see release updates in this demo.'
                          : 'Release updates are quiet for now.'}
                      </p>
                      <Progress
                        value={members.length}
                        max={6}
                        size="sm"
                        aria-label="Demo team seats"
                      />
                      <p {...s.muted}>{members.length} of 6 demo seats used</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link to="/ui/$component" params={{ component: 'switch' }}>
                      Edit the switch stylesheet ↗
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </StyleOverrides>
      <section {...s.grid} aria-label="Explore the building blocks">
        {[
          [
            'button',
            'Button',
            'Appearances, sizes and interaction states in a single stylesheet.',
          ],
          [
            'card',
            'Card',
            'Switch density and surface treatments across a composed card.',
          ],
          [
            'progress',
            'Progress',
            'Custom ranges, accessible values and three track sizes.',
          ],
          [
            'input',
            'Input',
            'Read the source and edit tokens live; the field keeps its value.',
          ],
        ].map(([component, title, body]) => (
          <Link
            key={component}
            to="/ui/$component"
            params={{ component }}
            {...s.panel}
          >
            <span {...s.eyebrow}>{component} ↗</span>
            <h2>{title}</h2>
            <p {...s.muted}>{body}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
