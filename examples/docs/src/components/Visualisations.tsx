import { createElements, useStyles } from '@toned/react'
import { useId, useState } from 'react'
import { homeStyles } from '../styles/home.ts'
import { tones } from '../styles/system.ts'
import { visualStyles } from '../styles/visualisations.ts'
import { ChoiceButton } from './ChoiceButton.tsx'

const V = createElements(visualStyles)

/** Connections from the token card to each part, top to bottom. */
const flows = [
  'M300 170C350 170 350 60 400 60',
  'M300 170H400',
  'M300 170C350 170 350 280 400 280',
]
const parts = [
  { name: 'Icon', declaration: "surface: 'accent'", y: 60 },
  { name: 'Badge', declaration: "surface: 'soft'", y: 170 },
  { name: 'Button', declaration: "surface: 'accent'", y: 280 },
]

export function TokenMap() {
  const s = useStyles(homeStyles)
  const [tone, setTone] = useState<'blue' | 'violet' | 'coral'>('blue')
  // SVG ids must be unique per instance and safe inside url(#…).
  const id = `token-map-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const label = `A ${tone} accent token connects to an icon, a badge, and a button`
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
              viewBox="0 0 960 340"
              role="img"
              aria-label={label}
            >
              <defs>
                <pattern
                  id={`${id}-dots`}
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="2"
                    cy="2"
                    r="1"
                    fill="currentColor"
                    opacity="0.2"
                  />
                </pattern>
                <filter
                  id={`${id}-lift`}
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="150%"
                >
                  <feDropShadow
                    dx="0"
                    dy="8"
                    stdDeviation="10"
                    floodColor="currentColor"
                    floodOpacity="0.18"
                  />
                </filter>
              </defs>
              <rect width="960" height="340" fill={`url(#${id}-dots)`} />
              <circle
                cx="160"
                cy="170"
                r="150"
                fill="currentColor"
                opacity="0.07"
              />

              {/* The token: its name, the chosen value and what it resolves to. */}
              <rect
                x="20"
                y="105"
                width="280"
                height="130"
                rx="18"
                fill="currentColor"
                filter={`url(#${id}-lift)`}
              />
              <g fill="white" fontFamily="monospace">
                <text
                  x="44"
                  y="138"
                  fontSize="11"
                  letterSpacing="1.5"
                  opacity="0.7"
                >
                  DESIGN TOKEN
                </text>
                <text x="44" y="172" fontSize="22">
                  accent: '{tone}'
                </text>
                <rect
                  x="44"
                  y="190"
                  width="112"
                  height="28"
                  rx="14"
                  opacity="0.16"
                />
                <circle cx="60" cy="204" r="6" />
                <text x="74" y="209" fontSize="13">
                  {tones[tone].accent}
                </text>
              </g>

              <V.Flow
                as="g"
                className="tnd-token-flow"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.55"
              >
                {flows.map((d) => (
                  <path key={d} d={d} />
                ))}
              </V.Flow>
              {/* A pulse travels each connection; hidden under reduced motion. */}
              <g className="tnd-token-pulse" fill="currentColor">
                {flows.map((d, index) => (
                  <circle key={d} r="4.5">
                    <animateMotion
                      dur="2.4s"
                      begin={`${index * 0.4}s`}
                      repeatCount="indefinite"
                      path={d}
                    />
                  </circle>
                ))}
              </g>

              {/* The named parts, each with the declaration that reads the token. */}
              {parts.map((part) => (
                <g key={part.name}>
                  <rect
                    x="400"
                    y={part.y - 33}
                    width="215"
                    height="66"
                    rx="14"
                    fill="white"
                    stroke="currentColor"
                    strokeOpacity="0.35"
                    strokeWidth="1.5"
                  />
                  <text
                    x="422"
                    y={part.y - 5}
                    fill="currentColor"
                    fontSize="16"
                    fontWeight="700"
                  >
                    {part.name}
                  </text>
                  <text
                    x="422"
                    y={part.y + 17}
                    fill="currentColor"
                    fontFamily="monospace"
                    fontSize="12"
                    opacity="0.75"
                  >
                    {part.declaration}
                  </text>
                  <circle cx="400" cy={part.y} r="4" fill="currentColor" />
                  <circle cx="615" cy={part.y} r="4" fill="currentColor" />
                </g>
              ))}

              {/* What those parts render: one card, three uses of the token. */}
              <rect
                x="700"
                y="20"
                width="240"
                height="300"
                rx="22"
                fill="white"
                stroke="currentColor"
                strokeOpacity="0.2"
                filter={`url(#${id}-lift)`}
              />
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.4"
              >
                <path d="M615 60C665 60 675 72 724 72" />
                <path d="M615 170C665 170 680 167 724 167" />
                <path d="M615 280C665 280 680 273 724 273" />
              </g>
              <rect
                x="724"
                y="44"
                width="56"
                height="56"
                rx="16"
                fill="currentColor"
              />
              <path
                d="m752 58 16 10-16 10-16-10 16-10Zm-16 17 16 10 16-10"
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
              <rect
                x="794"
                y="56"
                width="112"
                height="10"
                rx="5"
                fill="#17234b"
                opacity="0.8"
              />
              <rect
                x="794"
                y="76"
                width="72"
                height="8"
                rx="4"
                fill="#17234b"
                opacity="0.22"
              />
              <rect
                x="724"
                y="150"
                width="112"
                height="34"
                rx="17"
                fill="currentColor"
                opacity="0.14"
              />
              <text
                x="744"
                y="172"
                fill="currentColor"
                fontSize="13"
                fontWeight="600"
              >
                In progress
              </text>
              <rect
                x="724"
                y="206"
                width="192"
                height="6"
                rx="3"
                fill="currentColor"
                opacity="0.14"
              />
              <rect
                x="724"
                y="206"
                width="122"
                height="6"
                rx="3"
                fill="currentColor"
              />
              <rect
                x="724"
                y="250"
                width="192"
                height="46"
                rx="12"
                fill="currentColor"
              />
              <text
                x="820"
                y="278"
                fill="white"
                fontSize="15"
                fontWeight="600"
                textAnchor="middle"
              >
                Continue
              </text>
            </V.Diagram>
            <V.MobileDiagram
              as="svg"
              viewBox="0 0 320 310"
              role="img"
              aria-label={label}
            >
              <rect
                x="20"
                y="10"
                width="280"
                height="100"
                rx="16"
                fill="currentColor"
              />
              <g fill="white" fontFamily="monospace">
                <text
                  x="42"
                  y="38"
                  fontSize="11"
                  letterSpacing="1.5"
                  opacity="0.7"
                >
                  DESIGN TOKEN
                </text>
                <text x="42" y="66" fontSize="20">
                  accent: '{tone}'
                </text>
                <text x="42" y="92" fontSize="13" opacity="0.8">
                  {tones[tone].accent}
                </text>
              </g>
              <V.Flow
                as="g"
                className="tnd-token-flow"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.55"
              >
                <path d="M160 110v36H56v44M160 110v80M160 146h104v44" />
              </V.Flow>
              <g fill="currentColor">
                <rect x="24" y="194" width="64" height="64" rx="16" />
                <rect
                  x="114"
                  y="208"
                  width="92"
                  height="36"
                  rx="18"
                  opacity="0.15"
                />
                <rect x="222" y="202" width="84" height="48" rx="10" />
              </g>
              <path
                d="m56 209 15 10-15 10-15-10 15-10Zm-15 17 15 10 15-10"
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x="160"
                y="231"
                fill="currentColor"
                fontSize="13"
                textAnchor="middle"
              >
                Ready
              </text>
              <text
                x="264"
                y="231"
                fill="white"
                fontSize="13"
                textAnchor="middle"
              >
                Save
              </text>
              <g
                fill="currentColor"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
              >
                <text x="56" y="286">
                  Icon
                </text>
                <text x="160" y="286">
                  Badge
                </text>
                <text x="264" y="286">
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
