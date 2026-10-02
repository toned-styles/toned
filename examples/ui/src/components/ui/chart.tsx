import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

/*
 * Recharts draws the axes, grid and cursor as SVG with its own class names;
 * their colours are set in styles.css. Series colours come from the chart's
 * config as `--color-<key>` variables.
 */
export const chartStyles = stylesheet({
  root: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    typo: 'caption',
    textColor: 'muted',
    // No token for aspect ratio.
    '@platform web': { $style: { aspectRatio: '16 / 9' } },
  },
  tooltip: {
    display: 'grid',
    alignItems: 'flex-start',
    gap: 1.5,
    minWidth: '8rem',
    paddingX: 2.5,
    paddingY: 1.5,
    bgColor: 'elevated',
    textColor: 'default',
    borderColor: 'default',
    borderWidth: 'thin',
    borderRadius: 'medium',
    shadow: 'large',
    typo: 'caption',
  },
  tooltipLabel: {
    fontWeight: 500,
  },
  tooltipList: {
    display: 'grid',
    gap: 1.5,
  },
  tooltipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    width: '100%',
  },
  // The series colour is data, so it arrives as an inline background.
  indicator: {
    flexShrink: '0',
    width: '0.625rem',
    height: '0.625rem',
    borderRadius: 'small',
  },
  tooltipText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    flexGrow: '1',
  },
  tooltipName: {
    textColor: 'muted',
  },
  tooltipValue: {
    textColor: 'default',
    fontWeight: 500,
    // No token for tabular figures.
    '@platform web': { $style: { fontVariantNumeric: 'tabular-nums' } },
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    textColor: 'default',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
  legendSwatch: {
    flexShrink: '0',
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: 'small',
  },
}).variants(
  (
    $: Variants<{
      indicator: 'dot' | 'line' | 'dashed'
      legend: 'top' | 'bottom'
    }>,
  ) => ({
    [$.indicator('line')]: {
      indicator: { width: '0.25rem', height: '1rem' },
    },
    [$.indicator('dashed')]: {
      indicator: { width: '0.75rem', height: '0.125rem' },
    },
    [$.legend('top')]: { legend: { paddingBottom: 3 } },
    [$.legend('bottom')]: { legend: { paddingTop: 3 } },
  }),
  { defaults: { indicator: 'dot', legend: 'bottom' } },
)

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`
  const s = useStyles(chartStyles)

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        {...s.root.with({ className })}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {/* A one-pixel floor: Recharts warns whenever it measures an empty
            box, which happens for a frame while a layout is collapsing. */}
        <RechartsPrimitive.ResponsiveContainer minWidth={1} minHeight={1}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color,
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  // Recharts passes these to custom content; it reads them from its context.
  Partial<
    Pick<RechartsPrimitive.TooltipContentProps, 'active' | 'payload' | 'label'>
  > &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
  }) {
  const { config } = useChart()
  const s = useStyles(chartStyles, { indicator })

  if (!active || !payload?.length) {
    return null
  }

  const [first] = payload
  const labelConfig = getPayloadConfigFromPayload(
    config,
    first,
    `${labelKey || first?.dataKey || first?.name || 'value'}`,
  )
  const labelValue =
    !labelKey && typeof label === 'string'
      ? config[label]?.label || label
      : labelConfig?.label
  const heading = labelFormatter
    ? labelFormatter(labelValue, payload)
    : labelValue

  return (
    <div data-slot="chart-tooltip" {...s.tooltip.with({ className })}>
      {!hideLabel && heading ? (
        <div className={labelClassName} {...s.tooltipLabel}>
          {heading}
        </div>
      ) : null}
      <div {...s.tooltipList}>
        {payload
          .filter((item) => item.type !== 'none')
          .map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || item.payload.fill || item.color

            return (
              <ChartTooltipRow
                key={
                  typeof item.dataKey === 'function'
                    ? index
                    : (item.dataKey ?? index)
                }
                indicator={indicator}
                color={hideIndicator ? undefined : indicatorColor}
                icon={itemConfig?.icon}
                name={itemConfig?.label || item.name}
                value={item.value}
              >
                {formatter && item?.value !== undefined && item.name
                  ? formatter(item.value, item.name, item, index, item.payload)
                  : null}
              </ChartTooltipRow>
            )
          })}
      </div>
    </div>
  )
}

/** One series in the tooltip. Each row resolves its own style bags. */
function ChartTooltipRow({
  indicator,
  color,
  icon: Icon,
  name,
  value,
  children,
}: {
  indicator: 'line' | 'dot' | 'dashed'
  color?: string
  icon?: React.ComponentType
  name: React.ReactNode
  value?: number | string | ReadonlyArray<number | string>
  children?: React.ReactNode
}) {
  const s = useStyles(chartStyles, { indicator })

  return (
    <div {...s.tooltipRow}>
      {children ?? (
        <>
          {Icon ? (
            <Icon />
          ) : (
            color && (
              <div
                {...s.indicator.with({ style: { backgroundColor: color } })}
              />
            )
          )}
          <div {...s.tooltipText}>
            <span {...s.tooltipName}>{name}</span>
            {value !== undefined && (
              <span {...s.tooltipValue}>{value.toLocaleString()}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> &
  Pick<
    RechartsPrimitive.DefaultLegendContentProps,
    'payload' | 'verticalAlign'
  > & {
    hideIcon?: boolean
    nameKey?: string
  }) {
  const { config } = useChart()
  const s = useStyles(chartStyles, {
    legend: verticalAlign === 'top' ? 'top' : 'bottom',
  })

  if (!payload?.length) {
    return null
  }

  return (
    <div data-slot="chart-legend" {...s.legend.with({ className })}>
      {payload
        .filter((item) => item.type !== 'none')
        .map((item) => {
          const key = `${nameKey || item.dataKey || 'value'}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <ChartLegendItem
              key={item.value}
              color={item.color}
              icon={hideIcon ? undefined : itemConfig?.icon}
            >
              {itemConfig?.label}
            </ChartLegendItem>
          )
        })}
    </div>
  )
}

/** One series in the legend. Each item resolves its own style bags. */
function ChartLegendItem({
  color,
  icon: Icon,
  children,
}: {
  color?: string
  icon?: React.ComponentType
  children?: React.ReactNode
}) {
  const s = useStyles(chartStyles)

  return (
    <div {...s.legendItem}>
      {Icon ? (
        <Icon />
      ) : (
        <div {...s.legendSwatch.with({ style: { backgroundColor: color } })} />
      )}
      {children}
    </div>
  )
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined
  }

  const payloadPayload =
    'payload' in payload &&
    typeof payload.payload === 'object' &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === 'string'
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
