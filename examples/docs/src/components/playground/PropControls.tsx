import { useStyles } from '@toned/react'
import { useId } from 'react'
import type { PropDoc } from 'virtual:component-docs/*'

import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select.tsx'
import { Switch } from '@/components/ui/switch.tsx'

import { playgroundStyles } from '../../styles/playground.ts'

export interface PropGroup {
  /** The component the props belong to; omitted when there is only one. */
  title?: string
  props: Record<string, PropDoc>
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
}

type ControlType = 'boolean' | 'select' | 'text' | 'number' | 'readonly'

function typeName(prop: PropDoc) {
  return prop.type.name
    .split(' | ')
    .filter((value) => value !== 'undefined' && value !== 'null')
    .join(' | ')
}

function getControlType(prop: PropDoc): ControlType {
  if (prop.name === 'asChild') return 'readonly'
  const name = typeName(prop)

  if (name === 'boolean') return 'boolean'

  if (prop.type.value && prop.type.value.length > 0) return 'select'

  if (name === 'number') return 'number'

  if (name === 'string' || name === 'ReactNode' || prop.name === 'children')
    return 'text'

  return 'readonly'
}

/** The default written in the component's signature, shown until a control is used. */
function declaredDefault(prop: PropDoc): unknown {
  const raw = prop.defaultValue?.value
  if (raw == null) return undefined
  const type = getControlType(prop)
  if (type === 'boolean') return raw === 'true'
  if (type === 'number') return Number(raw)
  return raw
}

/** One panel of prop controls, with a group for each documented component. */
export function PropControls({ groups }: { groups: PropGroup[] }) {
  const s = useStyles(playgroundStyles)
  const visible = groups
    .map((group) => ({
      ...group,
      // Callbacks, objects and elements have no control; the source lists them.
      entries: Object.entries(group.props).filter(
        ([name, prop]) =>
          name !== 'ref' &&
          name !== 'key' &&
          getControlType(prop) !== 'readonly',
      ),
    }))
    .filter((group) => group.entries.length > 0)

  return (
    <section {...s.controls} aria-label="Props" data-gallery-chrome>
      {visible.length === 0 && (
        <>
          <div {...s.controlsTitle}>Props</div>
          <div {...s.empty}>No configurable props.</div>
        </>
      )}
      {visible.map((group, index) => (
        <div
          key={group.title ?? 'props'}
          {...(index ? s.controlGroupNext : s.controlGroup)}
        >
          <div {...s.controlsTitle}>{group.title ?? 'Props'}</div>
          <div {...s.controlGrid}>
            {group.entries.map(([name, prop]) => (
              <PropControl
                key={name}
                prop={prop}
                value={group.values[name] ?? declaredDefault(prop)}
                onChange={(value) => group.onChange(name, value)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
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
  const id = useId()
  // A ReactNode that is not plain text cannot be edited as text.
  if (controlType === 'text' && value != null && typeof value === 'object')
    return null

  return (
    <div {...s.controlRow}>
      <div {...s.controlLabel}>
        <Label htmlFor={id} title={prop.description || undefined}>
          {prop.name}
          {prop.required ? ' *' : ''}
        </Label>
      </div>
      <div {...s.controlInput}>
        {controlType === 'boolean' && (
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
            size="sm"
          />
        )}
        {controlType === 'select' && (
          // A native control: its list is drawn by the browser, so it stays in
          // the site's look whichever theme the preview is in.
          <NativeSelect
            id={id}
            size="sm"
            value={value == null ? '' : String(value)}
            onChange={(event) => onChange(event.target.value)}
          >
            <NativeSelectOption value="">Not set</NativeSelectOption>
            {prop.type.value?.map((opt) => (
              <NativeSelectOption key={opt.value} value={opt.value}>
                {opt.value}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        {controlType === 'text' && (
          <Input
            id={id}
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {controlType === 'number' && (
          <Input
            id={id}
            type="number"
            value={
              typeof value === 'number' && !Number.isNaN(value) ? value : ''
            }
            onChange={(e) =>
              onChange(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        )}
      </div>
    </div>
  )
}
