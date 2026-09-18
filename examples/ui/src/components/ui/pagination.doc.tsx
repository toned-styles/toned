import { c, doc } from '@/lib/doc.tsx'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination.tsx'

export default doc({
  components: [
    c({ Pagination }, {}),
    c({ PaginationContent }, {}),
    c({ PaginationItem }, {}),
    c({ PaginationLink }, { href: '#', children: '1' }),
    c({ PaginationPrevious }, { href: '#' }),
    c({ PaginationNext }, { href: '#' }),
    c({ PaginationEllipsis }, {}),
  ],
  preview: (C) => (
    <C.Pagination>
      <C.PaginationContent>
        <C.PaginationItem>
          <C.PaginationPrevious />
        </C.PaginationItem>
        <C.PaginationItem>
          <C.PaginationLink href="#" isActive>
            1
          </C.PaginationLink>
        </C.PaginationItem>
        <C.PaginationItem>
          <C.PaginationLink href="#">2</C.PaginationLink>
        </C.PaginationItem>
        <C.PaginationItem>
          <C.PaginationLink href="#">3</C.PaginationLink>
        </C.PaginationItem>
        <C.PaginationItem>
          <C.PaginationEllipsis />
        </C.PaginationItem>
        <C.PaginationItem>
          <C.PaginationNext />
        </C.PaginationItem>
      </C.PaginationContent>
    </C.Pagination>
  ),
})
