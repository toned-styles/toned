import { createElements, useStyles } from '@toned/react'
import { useState } from 'react'
import { homeStyles } from '../styles/home.ts'
import { visualStyles } from '../styles/visualisations.ts'
import { ChoiceButton } from './ChoiceButton.tsx'

const V = createElements(visualStyles)

export function TokenMap() {
  const s = useStyles(homeStyles)
  const [tone, setTone] = useState<'blue' | 'violet' | 'coral'>('blue')
  return (
    <section aria-labelledby="token-map-title" {...s.Section}>
      <div {...s.SectionIntro}>
        <h2 id="token-map-title" {...s.Heading}>
          One token, several parts
        </h2>
        <p {...s.Body}>
          Change the accent token and follow the value into each named part that
          uses it.
        </p>
      </div>
      <div {...s.Choices} role="group" aria-label="Token map accent">
        {(['blue', 'violet', 'coral'] as const).map((value) => (
          <ChoiceButton
            key={value}
            selected={tone === value}
            onClick={() => setTone(value)}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </ChoiceButton>
        ))}
      </div>
      <V tone={tone}>
        <V.Root as="div">
          <V.Map as="div">
            <V.Diagram
              as="svg"
              viewBox="0 0 960 310"
              role="img"
              aria-label={`A ${tone} accent token connects to an icon, a badge, and a button`}
            >
              <V.Flow
                as="g"
                className="tnd-token-flow"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.5"
              >
                <path d="M250 155H355Q380 155 380 130V65Q380 45 405 45H540" />
                <path d="M250 155H540" />
                <path d="M250 155H355Q380 155 380 180V245Q380 265 405 265H540" />
              </V.Flow>
              <rect
                x="20"
                y="107"
                width="230"
                height="96"
                rx="16"
                fill="currentColor"
              />
              <g fill="white" fontFamily="monospace">
                <text x="45" y="144" fontSize="14" opacity="0.75">
                  Design token
                </text>
                <text x="45" y="176" fontSize="22">
                  accent: '{tone}'
                </text>
              </g>
              <g fill="white" stroke="currentColor" strokeWidth="1.5">
                <rect x="540" y="12" width="175" height="66" rx="12" />
                <rect x="540" y="122" width="175" height="66" rx="12" />
                <rect x="540" y="232" width="175" height="66" rx="12" />
              </g>
              <g fill="currentColor" fontFamily="monospace" fontSize="18">
                <text x="565" y="51">
                  Icon
                </text>
                <text x="565" y="161">
                  Badge
                </text>
                <text x="565" y="271">
                  Button
                </text>
              </g>
              <g stroke="currentColor" strokeWidth="2" opacity="0.35">
                <path d="M715 45h50M715 155h50M715 265h50" />
              </g>
              <rect
                x="785"
                y="15"
                width="60"
                height="60"
                rx="16"
                fill="currentColor"
              />
              <path
                d="m815 29 16 10-16 10-16-10 16-10Zm-16 17 16 10 16-10"
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
              <rect
                x="785"
                y="135"
                width="140"
                height="40"
                rx="20"
                fill="currentColor"
                opacity="0.12"
              />
              <text
                x="815"
                y="161"
                fill="currentColor"
                fontSize="15"
                fontWeight="600"
              >
                In progress
              </text>
              <rect
                x="785"
                y="242"
                width="140"
                height="46"
                rx="10"
                fill="currentColor"
              />
              <text x="818" y="271" fill="white" fontSize="15" fontWeight="600">
                Continue
              </text>
              <g fill="currentColor">
                <circle cx="380" cy="155" r="5" />
                <circle cx="540" cy="45" r="4" />
                <circle cx="540" cy="155" r="4" />
                <circle cx="540" cy="265" r="4" />
              </g>
            </V.Diagram>
            <V.MobileDiagram
              as="svg"
              viewBox="0 0 320 290"
              role="img"
              aria-label={`A ${tone} accent token connects to an icon, a badge, and a button`}
            >
              <rect
                x="50"
                y="10"
                width="220"
                height="80"
                rx="16"
                fill="currentColor"
              />
              <g fill="white" fontFamily="monospace">
                <text x="72" y="40" fontSize="13">
                  Design token
                </text>
                <text x="72" y="68" fontSize="20">
                  accent: '{tone}'
                </text>
              </g>
              <V.Flow
                as="g"
                className="tnd-token-flow"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.5"
              >
                <path d="M160 90v40H52v45M160 90v85M160 130h108v45" />
              </V.Flow>
              <g fill="currentColor">
                <rect x="20" y="180" width="64" height="64" rx="16" />
                <rect
                  x="114"
                  y="194"
                  width="92"
                  height="36"
                  rx="18"
                  opacity="0.15"
                />
                <rect x="222" y="188" width="92" height="48" rx="8" />
              </g>
              <path
                d="m52 195 15 10-15 10-15-10 15-10Zm-15 17 15 10 15-10"
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
              <text x="133" y="217" fill="currentColor" fontSize="13">
                Ready
              </text>
              <text x="244" y="217" fill="white" fontSize="13">
                Save
              </text>
              <g fill="currentColor" fontSize="14" textAnchor="middle">
                <text x="52" y="276">
                  Icon
                </text>
                <text x="160" y="276">
                  Badge
                </text>
                <text x="268" y="276">
                  Button
                </text>
              </g>
            </V.MobileDiagram>
          </V.Map>
          <V.Caption as="p">
            One typed value flows into three named parts. No repeated colour
            values.
          </V.Caption>
        </V.Root>
      </V>
    </section>
  )
}

export function LayoutExplorer() {
  const s = useStyles(homeStyles)
  const [size, setSize] = useState<'narrow' | 'wide'>('wide')
  return (
    <section {...s.Section} aria-labelledby="layout-title">
      <div {...s.SectionIntro}>
        <h2 id="layout-title" {...s.Heading}>
          Container conditions
        </h2>
        <p {...s.Body}>
          The same component is used in sidebars, panels and full pages. A
          container condition lets its layout depend on the space it has.
        </p>
      </div>
      <div {...s.Choices} role="group" aria-label="Preview container size">
        <ChoiceButton
          selected={size === 'narrow'}
          onClick={() => setSize('narrow')}
        >
          Narrow container
        </ChoiceButton>
        <ChoiceButton
          selected={size === 'wide'}
          onClick={() => setSize('wide')}
        >
          Wide container
        </ChoiceButton>
      </div>
      <V size={size}>
        <V.Root as="div">
          <V.Stage as="div">
            <V.Frame as="div" className="tnd-layout-frame">
              <V.Card as="div" className="tnd-layout-card">
                <V.Artwork as="div" aria-hidden="true">
                  <svg
                    aria-hidden="true"
                    width="100"
                    height="100"
                    viewBox="0 0 100 100"
                    fill="none"
                  >
                    <rect
                      x="16"
                      y="16"
                      width="68"
                      height="68"
                      rx="18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      transform="rotate(-15 50 50)"
                    />
                    <rect
                      x="24"
                      y="24"
                      width="52"
                      height="52"
                      rx="12"
                      fill="currentColor"
                      opacity="0.25"
                      transform="rotate(15 50 50)"
                    />
                    <path
                      d="M34 36h32v10H55v25H45V46H34V36Z"
                      fill="currentColor"
                    />
                  </svg>
                </V.Artwork>
                <V.Copy as="div">
                  <V.Indicator as="p">
                    <V.Wide as="span">Wide condition is active</V.Wide>
                    <V.Narrow as="span">Base layout is active</V.Narrow>
                  </V.Indicator>
                  <V.Title as="h3">Sample card</V.Title>
                  <V.Text as="p">
                    The browser chooses the layout from the container width.
                  </V.Text>
                </V.Copy>
              </V.Card>
            </V.Frame>
          </V.Stage>
        </V.Root>
      </V>
      <p {...s.FeatureBody}>
        The wide layout starts at 480px of container space. On smaller screens,
        even the wide preview keeps the compact layout.
      </p>
    </section>
  )
}
