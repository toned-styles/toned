import { createFileRoute } from '@tanstack/react-router'
import { Examples } from '../components/lab/ExamplesPage.tsx'

export const Route = createFileRoute('/examples')({ component: Examples })
