import { createFileRoute } from '@tanstack/react-router'
import { Lab } from '../components/lab/LabPage.tsx'
export const Route = createFileRoute('/lab')({ component: Lab })
