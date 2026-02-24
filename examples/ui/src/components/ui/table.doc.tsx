import { doc, c } from '@/lib/doc'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from './table'

export default doc({
  components: [
    c({ Table }, {}),
    c({ TableHeader }, {}),
    c({ TableBody }, {}),
    c({ TableRow }, {}),
    c({ TableHead }, { children: 'Name' }),
    c({ TableCell }, { children: 'John Doe' }),
    c({ TableCaption }, { children: 'A list of users.' }),
  ],
  preview: (C) => (
    <C.Table>
      <C.TableCaption />
      <C.TableHeader>
        <C.TableRow>
          <C.TableHead>Name</C.TableHead>
          <C.TableHead>Email</C.TableHead>
          <C.TableHead>Role</C.TableHead>
        </C.TableRow>
      </C.TableHeader>
      <C.TableBody>
        <C.TableRow>
          <C.TableCell>John Doe</C.TableCell>
          <C.TableCell>john@example.com</C.TableCell>
          <C.TableCell>Admin</C.TableCell>
        </C.TableRow>
        <C.TableRow>
          <C.TableCell>Jane Smith</C.TableCell>
          <C.TableCell>jane@example.com</C.TableCell>
          <C.TableCell>User</C.TableCell>
        </C.TableRow>
      </C.TableBody>
    </C.Table>
  ),
})
