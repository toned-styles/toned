import { c, doc } from '@/lib/doc.tsx'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb.tsx'

export default doc({
  description:
    'Shows where the current page sits in a hierarchy, with links back to each level above it.',
  components: [
    c({ Breadcrumb }, {}),
    c({ BreadcrumbList }, {}),
    c({ BreadcrumbItem }, {}),
    c({ BreadcrumbLink }, { href: '#', children: 'Home' }),
    c({ BreadcrumbPage }, { children: 'Breadcrumb' }),
    c({ BreadcrumbSeparator }, {}),
  ],
  preview: (C) => (
    <C.Breadcrumb>
      <C.BreadcrumbList>
        <C.BreadcrumbItem>
          <C.BreadcrumbLink />
        </C.BreadcrumbItem>
        <C.BreadcrumbSeparator />
        <C.BreadcrumbItem>
          <BreadcrumbEllipsis />
        </C.BreadcrumbItem>
        <C.BreadcrumbSeparator />
        <C.BreadcrumbItem>
          <BreadcrumbLink href="#">Components</BreadcrumbLink>
        </C.BreadcrumbItem>
        <C.BreadcrumbSeparator />
        <C.BreadcrumbItem>
          <C.BreadcrumbPage />
        </C.BreadcrumbItem>
      </C.BreadcrumbList>
    </C.Breadcrumb>
  ),
})
