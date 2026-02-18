import { useStyles } from '@toned/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { playgroundStyles } from '../../styles/playground.ts'
import type { PropDoc } from 'virtual:component-docs/*'

interface PropControlsProps {
  title?: string
  props: Record<string, PropDoc>
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
}

function getControlType(
  prop: PropDoc,
): 'boolean' | 'select' | 'text' | 'number' | 'readonly' {
  const typeName = prop.type.name

  if (typeName === 'boolean') return 'boolean'

  if (prop.type.value && prop.type.value.length > 0) return 'select'

  if (typeName === 'number') return 'number'

  if (
    typeName === 'string' ||
    typeName === 'ReactNode' ||
    prop.name === 'children'
  )
    return 'text'

  return 'readonly'
}

export function PropControls({ title, props, values, onChange }: PropControlsProps) {
  const s = useStyles(playgroundStyles)

  const heading = title ?? 'Props'

  const propEntries = Object.entries(props).filter(
    ([name]) => name !== 'ref' && name !== 'key',
  )

  if (propEntries.length === 0) {
    return (
      <div {...s.controls}>
        <div {...s.controlsTitle}>{heading}</div>
        <div {...s.readOnly}>No configurable props</div>
      </div>
    )
  }

  return (
    <div {...s.controls}>
      <div {...s.controlsTitle}>{heading}</div>
      <div {...s.controlGrid}>
        {propEntries.map(([name, prop]) => (
          <PropControl
            key={name}
            prop={prop}
            value={values[name]}
            onChange={(value) => onChange(name, value)}
          />
        ))}
      </div>
    </div>
  )
}

function PropControl({
  prop,
  value,
  onChange,
}: {
  prop: PropDoc
  value: unknown
  onChange: (value: unknown) => void
}) {
  const s = useStyles(playgroundStyles)
  const controlType = getControlType(prop)

  return (
    <div {...s.controlRow}>
      <Label title={prop.description || undefined} style={{ minWidth: '120px', flexShrink: 0 }}>
        {prop.name}
        {prop.required ? ' *' : ''}
      </Label>
      <div {...s.controlInput}>
        {controlType === 'boolean' && (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
            size="sm"
          />
        )}
        {controlType === 'select' && (
          <Select
            value={String(value ?? '')}
            onValueChange={(val) => onChange(val)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {prop.type.value?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {controlType === 'text' && (
          <Input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {controlType === 'number' && (
          <Input
            type="number"
            value={String(value ?? '')}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        )}
        {controlType === 'readonly' && (
          <span {...s.readOnly}>{prop.type.name}</span>
        )}
      </div>
    </div>
  )
}
