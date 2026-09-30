import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resolve = (p) => path.resolve(__dirname, p)

// All known routes to prerender
const routes = [
  '/',
  '/getting-started',
  '/playground',
  '/concepts',
  '/explore',
  '/lab',
  ...[
    'core',
    'react',
    'stylesheets',
    'systems',
    'themes',
    'adaptive',
    'motion',
    'renderers',
    'native',
    'hosts',
    'backends',
    'compiler',
    'source',
    'inspector',
    'bridge',
    'vscode',
    'lint',
    'tokens',
    'contracts',
    'engine',
    'benchmarks',
    'examples',
  ].map((topic) => `/learn/${topic}`),
  '/api/define-system',
  '/api/stylesheet',
  '/api/variants',
  '/api/use-styles',
  '/api/media-queries',
  '/guides/react-web',
  '/guides/react-native',
  '/guides/theming',
  '/guides/interactive',
  '/guides/ssr',
  '/ui',
  ...fs
    .readdirSync(resolve('../ui/src/components/ui'))
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.doc.tsx'))
    .map((file) => `/ui/${file.slice(0, -4)}`),
]

async function prerender() {
  const template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
  if (!template.includes('<!--app-html-->'))
    throw new Error(
      'The built HTML template is missing its SSR insertion point',
    )
  const { render } = await import('./dist/server/entry-server.js')

  for (const url of routes) {
    const appHtml = await render(url)

    const heading = appHtml
      .match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const title = heading
      ? `Toned — ${heading}`
      : 'Toned — Design with confidence'
    const html = template
      // Replacer functions keep `$$`/`$&` in rendered code samples literal.
      .replace('<!--app-html-->', () => appHtml)
      .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
      .replace(
        '</head>',
        `<link rel="canonical" href="https://toned.style${url}" /></head>`,
      )

    const filePath =
      url === '/'
        ? resolve('dist/client/index.html')
        : resolve(`dist/client${url}.html`)

    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, html)
    console.log(`  Prerendered: ${url}`)
  }

  console.log(`\nPrerendered ${routes.length} pages.`)
}

prerender().catch((err) => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
