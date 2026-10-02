'use client'

import type { Variants } from '@toned/core'
import { useStyles } from '@toned/react'
import { stylesheet } from '@toned/systems/base'
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button.tsx'

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: 'horizontal' | 'vertical'
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />')
  }

  return context
}

export const carouselStyles = stylesheet({
  root: {
    position: 'relative',
  },
  viewport: {
    overflow: 'hidden',
  },
  content: {
    display: 'flex',
  },
  item: {
    minWidth: 0,
    flexShrink: '0',
    flexGrow: '0',
    // No token: each slide takes the full width of the viewport.
    $style: { flexBasis: '100%' },
  },
  navButton: {
    position: 'absolute',
    borderRadius: 'full',
    width: '2rem',
    height: '2rem',
  },
}).variants(
  (
    $: Variants<{
      orientation: 'horizontal' | 'vertical'
      side: 'previous' | 'next'
    }>,
  ) => ({
    // Slides are spaced with padding, and the track pulls back by the same step.
    [$.orientation('horizontal')]: {
      content: { marginLeft: -4 },
      item: { paddingLeft: 4 },
      // No token for transforms: centres the button on the slide's edge.
      navButton: { top: '50%', $style: { transform: 'translateY(-50%)' } },
    },
    [$.orientation('vertical')]: {
      content: { flexLayout: 'column', marginTop: -4 },
      item: { paddingTop: 4 },
      navButton: {
        left: '50%',
        $style: { transform: 'translateX(-50%) rotate(90deg)' },
      },
    },
    [$.orientation('horizontal').side('previous')]: {
      navButton: { left: -12 },
    },
    [$.orientation('horizontal').side('next')]: {
      navButton: { right: -12 },
    },
    [$.orientation('vertical').side('previous')]: {
      navButton: { top: -12 },
    },
    [$.orientation('vertical').side('next')]: {
      navButton: { bottom: -12 },
    },
  }),
  { defaults: { orientation: 'horizontal', side: 'previous' } },
)

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins,
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)
  const s = useStyles(carouselStyles)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext],
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    // oxlint-disable-next-line react/set-state-in-effect -- reads the initial scroll state from the carousel API this effect subscribes to
    onSelect(api)
    api.on('reInit', onSelect)
    api.on('select', onSelect)

    return () => {
      api.off('reInit', onSelect)
      api.off('select', onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        {...s.root.with({ className })}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation = 'horizontal' } = useCarousel()
  const s = useStyles(carouselStyles, { orientation })

  return (
    <div
      data-slot="carousel-content"
      // The style bag carries its own ref, so the carousel's ref is merged in.
      {...s.viewport.with({ ref: carouselRef })}
    >
      <div {...s.content.with({ className })} {...props} />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation = 'horizontal' } = useCarousel()
  const s = useStyles(carouselStyles, { orientation })

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      {...s.item.with({ className })}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = 'outline',
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const {
    orientation = 'horizontal',
    scrollPrev,
    canScrollPrev,
  } = useCarousel()
  const s = useStyles(carouselStyles, { orientation, side: 'previous' })

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      aria-label="Previous slide"
      {...s.navButton.with({ className })}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
    </Button>
  )
}

function CarouselNext({
  className,
  variant = 'outline',
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const {
    orientation = 'horizontal',
    scrollNext,
    canScrollNext,
  } = useCarousel()
  const s = useStyles(carouselStyles, { orientation, side: 'next' })

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      aria-label="Next slide"
      {...s.navButton.with({ className })}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight />
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
