import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resolve = (p) => path.resolve(__dirname, p)

// All known routes to prerender
const routes = [
  '/',
  '/concepts',
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
]

async function prerender() {
  const template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
  const { render } = await import('./dist/server/entry-server.js')

  for (const url of routes) {
    const appHtml = await render(url)

    const html = template.replace('<!--app-html-->', appHtml)

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
