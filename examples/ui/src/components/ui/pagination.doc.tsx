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
  description:
    'Links between the pages of a long list, with the current page marked.',
  components: [
    c({ Pagination }, {}),
    c({ PaginationContent }, {}),
    c({ PaginationItem }, {}),
    c({ PaginationLink }, { href: '#' }),
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
          <C.PaginationLink href="#">1</C.PaginationLink>
        </C.PaginationItem>
        <C.PaginationItem>
          <C.PaginationLink href="#" isActive>
            2
          </C.PaginationLink>
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
