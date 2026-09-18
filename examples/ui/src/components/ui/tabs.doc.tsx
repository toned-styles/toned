import { c, doc } from '@/lib/doc.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.tsx'

export default doc({
  components: [
    c({ Tabs }, { defaultValue: 'tab1' }),
    c({ TabsList }, {}),
    c({ TabsTrigger }, { value: 'tab1', children: 'Account' }),
    c({ TabsContent }, { value: 'tab1', children: 'Account settings here.' }),
  ],
  preview: (C) => (
    <C.Tabs>
      <C.TabsList>
        <C.TabsTrigger value="tab1">Account</C.TabsTrigger>
        <C.TabsTrigger value="tab2">Password</C.TabsTrigger>
      </C.TabsList>
      <C.TabsContent value="tab1">Account settings here.</C.TabsContent>
      <C.TabsContent value="tab2">Password settings here.</C.TabsContent>
    </C.Tabs>
  ),
})
