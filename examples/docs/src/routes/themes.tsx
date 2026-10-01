import { createFileRoute } from '@tanstack/react-router'
import { ThemesPage } from '../components/themes/ThemesPage.tsx'

export const Route = createFileRoute('/themes')({ component: ThemesPage })
