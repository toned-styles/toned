import { doc, c } from '@/lib/doc'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from './breadcrumb'

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
