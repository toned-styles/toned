import { c, doc } from '@/lib/doc.tsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb.tsx'

export default doc({
  components: [
    c({ Breadcrumb }, {}),
    c({ BreadcrumbList }, {}),
    c({ BreadcrumbItem }, {}),
    c({ BreadcrumbLink }, { href: '#', children: 'Home' }),
    c({ BreadcrumbPage }, { children: 'Current' }),
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
          <C.BreadcrumbPage />
        </C.BreadcrumbItem>
      </C.BreadcrumbList>
    </C.Breadcrumb>
  ),
})
