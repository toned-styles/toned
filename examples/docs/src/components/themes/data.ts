export type Status = 'live' | 'rolling' | 'failed' | 'queued'

export type Release = {
  version: string
  branch: string
  status: Status
  owner: string
  rollout: number
}

export const projects = [
  { id: 'web', name: 'Web app' },
  { id: 'api', name: 'API' },
  { id: 'mobile', name: 'Mobile' },
  { id: 'docs', name: 'Docs' },
] as const

export type ProjectId = (typeof projects)[number]['id']

export const initialReleases: Record<ProjectId, Release[]> = {
  web: [
    {
      version: '4.12.0',
      branch: 'main',
      status: 'rolling',
      owner: 'AK',
      rollout: 60,
    },
    {
      version: '4.11.2',
      branch: 'hotfix/login',
      status: 'live',
      owner: 'MR',
      rollout: 100,
    },
    {
      version: '4.11.1',
      branch: 'main',
      status: 'failed',
      owner: 'JL',
      rollout: 20,
    },
    {
      version: '4.11.0',
      branch: 'main',
      status: 'live',
      owner: 'AK',
      rollout: 100,
    },
  ],
  api: [
    {
      version: '2.8.0',
      branch: 'main',
      status: 'rolling',
      owner: 'JL',
      rollout: 35,
    },
    {
      version: '2.7.4',
      branch: 'main',
      status: 'live',
      owner: 'MR',
      rollout: 100,
    },
    {
      version: '2.7.3',
      branch: 'fix/timeouts',
      status: 'live',
      owner: 'JL',
      rollout: 100,
    },
  ],
  mobile: [
    {
      version: '1.9.0',
      branch: 'release/1.9',
      status: 'queued',
      owner: 'AK',
      rollout: 0,
    },
    {
      version: '1.8.3',
      branch: 'main',
      status: 'live',
      owner: 'MR',
      rollout: 100,
    },
  ],
  docs: [
    {
      version: '0.31.0',
      branch: 'main',
      status: 'live',
      owner: 'JL',
      rollout: 100,
    },
  ],
}

/** Initials → name, for the people who own releases. */
export const people: Record<string, string> = {
  AK: 'Ada King',
  MR: 'Mo Rahimi',
  JL: 'Jun Lee',
}

export const statusLabel: Record<Status, string> = {
  live: 'Live',
  rolling: 'Rolling out',
  failed: 'Failed',
  queued: 'Queued',
}

export const statusTone = {
  live: 'ok',
  rolling: 'warn',
  failed: 'bad',
  queued: 'neutral',
} as const

export const stats = [
  {
    label: 'Deploys this week',
    value: '24',
    change: '+6',
    note: 'vs last week',
    tone: 'ok',
    trend: [4, 6, 5, 8, 7, 10, 9, 12],
  },
  {
    label: 'Success rate',
    value: '98.2%',
    change: '+0.4',
    note: 'points, 30 days',
    tone: 'ok',
    trend: [9, 9, 8, 9, 10, 9, 10, 10],
  },
  {
    label: 'Median build',
    value: '3m 12s',
    change: '+18s',
    note: 'vs last week',
    tone: 'warn',
    trend: [6, 5, 6, 7, 6, 8, 8, 9],
  },
] as const

/** Deploys per week, oldest first. */
export const weeklyDeploys = [8, 12, 9, 14, 11, 17, 13, 19, 16, 22, 18, 24]

export const activity = [
  { who: 'AK', text: 'Started the rollout of 4.12.0', when: '12 min ago' },
  { who: 'MR', text: 'Approved hotfix/login', when: '1 h ago' },
  { who: 'JL', text: 'Rolled back 4.11.1', when: 'Yesterday' },
  { who: 'AK', text: 'Changed the region to Frankfurt', when: '2 days ago' },
]

export const regions = ['Frankfurt', 'Virginia', 'Singapore', 'Sydney']
export const channels = ['Stable', 'Beta', 'Canary'] as const
export type Channel = (typeof channels)[number]
