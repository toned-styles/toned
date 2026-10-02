import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.tsx'

export default doc({
  description:
    'Switches between panels of content that share one space. The arrow keys move between tabs.',
  components: [
    c({ Tabs }, { defaultValue: 'overview' }),
    c({ TabsList }, { variant: 'default', 'aria-label': 'Project sections' }),
    c({ TabsTrigger }, { value: 'overview' }),
    c({ TabsContent }, { value: 'overview' }),
  ],
  preview: (C) => (
    <div {...t({ width: '100%', maxWidth: '400px' })}>
      <C.Tabs>
        <C.TabsList>
          <C.TabsTrigger value="overview">Overview</C.TabsTrigger>
          <C.TabsTrigger value="activity">Activity</C.TabsTrigger>
          <C.TabsTrigger value="settings">Settings</C.TabsTrigger>
        </C.TabsList>
        <C.TabsContent value="overview">
          <Card density="compact">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Three releases shipped this month.
              </CardDescription>
            </CardHeader>
            <CardContent>The next release is planned for Thursday.</CardContent>
          </Card>
        </C.TabsContent>
        <C.TabsContent value="activity">
          <Card density="compact">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>
                Twelve changes in the last week.
              </CardDescription>
            </CardHeader>
            <CardContent>Sam merged “Container queries” yesterday.</CardContent>
          </Card>
        </C.TabsContent>
        <C.TabsContent value="settings">
          <Card density="compact">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Visible to project owners.</CardDescription>
            </CardHeader>
            <CardContent>Release notifications are on.</CardContent>
          </Card>
        </C.TabsContent>
      </C.Tabs>
    </div>
  ),
})
