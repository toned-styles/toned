import { t } from '@toned/systems/base'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { c, doc } from '@/lib/doc.tsx'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from './chart.tsx'

const data = [
  { month: 'May', features: 6, fixes: 11 },
  { month: 'Jun', features: 9, fixes: 7 },
  { month: 'Jul', features: 4, fixes: 13 },
  { month: 'Aug', features: 11, fixes: 8 },
  { month: 'Sep', features: 8, fixes: 5 },
  { month: 'Oct', features: 12, fixes: 9 },
]

const config = {
  features: { label: 'Features', color: 'var(--chart-1)' },
  fixes: { label: 'Fixes', color: 'var(--chart-2)' },
} satisfies ChartConfig

export default doc({
  description:
    'A themed frame around Recharts: series colours come from a config, and the tooltip and legend use the collection’s tokens. The data here is illustrative.',
  components: [c({ ChartContainer }, { config })],
  preview: (C) => (
    <div {...t({ width: '100%', maxWidth: '460px' })}>
      <C.ChartContainer>
        <BarChart
          accessibilityLayer
          data={data}
          title="Changes shipped per month"
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="features" fill="var(--color-features)" radius={4} />
          <Bar dataKey="fixes" fill="var(--color-fixes)" radius={4} />
        </BarChart>
      </C.ChartContainer>
    </div>
  ),
})
