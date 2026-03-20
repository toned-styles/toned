import { createFileRoute, redirect } from '@tanstack/react-router'
import { componentNames } from '../../lib/component-registry.ts'

export const Route = createFileRoute('/ui/')({
  beforeLoad: () => {
    const first = componentNames[0]
    if (first) {
      throw redirect({ to: '/ui/$component', params: { component: first } })
    }
  },
  component: () => <p>No components found.</p>,
})
