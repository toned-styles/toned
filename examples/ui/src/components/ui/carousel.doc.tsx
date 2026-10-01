import { t } from '@toned/systems/base'

import { c, doc } from '@/lib/doc.tsx'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card.tsx'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './carousel.tsx'

const slides = [
  ['Tokens', 'Name each design value once.'],
  ['Parts', 'Give every element of a component a rule.'],
  ['Variants', 'Select appearance and size with props.'],
  ['Overrides', 'Restyle a subtree from an ancestor.'],
]

export default doc({
  description:
    'A row of slides shown one at a time. Drag, use the buttons, or press the left and right arrow keys.',
  components: [
    c({ Carousel }, {}),
    c({ CarouselContent }, {}),
    c({ CarouselItem }, {}),
    c({ CarouselPrevious }, {}),
    c({ CarouselNext }, {}),
  ],
  preview: (C) => (
    // The buttons sit outside the slides, so the wrapper reserves room for them.
    <div {...t({ width: '100%', maxWidth: '420px', paddingX: 12 })}>
      <C.Carousel aria-label="Toned concepts">
        <C.CarouselContent>
          {slides.map(([title, body], index) => (
            <C.CarouselItem key={title}>
              <Card density="compact">
                <CardHeader>
                  <CardDescription>
                    {index + 1} of {slides.length}
                  </CardDescription>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>{body}</CardContent>
              </Card>
            </C.CarouselItem>
          ))}
        </C.CarouselContent>
        <C.CarouselPrevious />
        <C.CarouselNext />
      </C.Carousel>
    </div>
  ),
})
