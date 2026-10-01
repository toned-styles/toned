import { t } from '@toned/systems/base'
import type { ComponentProps } from 'react'

import { c, doc } from '@/lib/doc.tsx'

import { DirectionProvider as Provider } from './direction.tsx'
import { Label } from './label.tsx'
import { Slider } from './slider.tsx'
import { Switch } from './switch.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.tsx'

/** The provider informs the primitives; the `dir` attribute lays out the DOM. */
function DirectionProvider({
  direction = 'rtl',
  children,
}: ComponentProps<typeof Provider>) {
  return (
    <Provider direction={direction}>
      <div dir={direction} {...t({ width: '100%', maxWidth: '360px' })}>
        {children}
      </div>
    </Provider>
  )
}

export default doc({
  description:
    'Sets the reading direction for the components inside it, so sliders, tabs and menus mirror for right-to-left languages.',
  components: [c({ DirectionProvider }, { direction: 'rtl' })],
  preview: (C) => (
    <C.DirectionProvider>
      <div {...t({ flexLayout: 'column', gap: 5 })}>
        <Tabs defaultValue="first">
          <TabsList aria-label="مثال">
            <TabsTrigger value="first">الأول</TabsTrigger>
            <TabsTrigger value="second">الثاني</TabsTrigger>
            <TabsTrigger value="third">الثالث</TabsTrigger>
          </TabsList>
          <TabsContent value="first">المحتوى الأول</TabsContent>
          <TabsContent value="second">المحتوى الثاني</TabsContent>
          <TabsContent value="third">المحتوى الثالث</TabsContent>
        </Tabs>
        <Slider defaultValue={[30]} aria-label="مستوى الصوت" />
        <div
          {...t({
            flexLayout: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <Label htmlFor="direction-switch">الإشعارات</Label>
          <Switch id="direction-switch" defaultChecked />
        </div>
      </div>
    </C.DirectionProvider>
  ),
})
