import { doc, c } from '@/lib/doc'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from './carousel'

export default doc({
  components: [
    c({ Carousel }, {}),
    c({ CarouselContent }, {}),
    c({ CarouselItem }, {}),
    c({ CarouselPrevious }, {}),
    c({ CarouselNext }, {}),
  ],
  preview: (C) => (
    <div style={{ width: '300px', marginLeft: '48px', marginRight: '48px' }}>
      <C.Carousel>
        <C.CarouselContent>
          {[1, 2, 3, 4, 5].map((n) => (
            <C.CarouselItem key={n}>
              <div style={{ padding: '24px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '24px', fontWeight: 600 }}>
                {n}
              </div>
            </C.CarouselItem>
          ))}
        </C.CarouselContent>
        <C.CarouselPrevious />
        <C.CarouselNext />
      </C.Carousel>
    </div>
  ),
})
