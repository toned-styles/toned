import fs from 'node:fs'
import http from 'node:http'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
})

async function ssrHandler(req, res) {
  const url = req.originalUrl ?? req.url

  try {
    let template = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf-8')
    template = await vite.transformIndexHtml(url, template)

    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')

    const appHtml = await render(url)

    const html = template.replace('<!--app-html-->', appHtml)

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  } catch (e) {
    vite.ssrFixStacktrace(e)
    console.error(e.stack)
    res.writeHead(500)
    res.end(e.message)
  }
}

const app = http.createServer((req, res) => {
  // Vite handles assets, HMR, source files; SSR handler catches page requests
  vite.middlewares(req, res, () => ssrHandler(req, res))
})

const port = process.env.PORT || 5173
app.listen(port, () => {
  console.log(`  SSR dev server: http://localhost:${port}/`)
})
