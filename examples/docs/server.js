import fs from 'node:fs'
import http from 'node:http'
import { createServer } from 'vite'

const vite = await createServer({
  configLoader: 'runner',
  server: { middlewareMode: true },
  appType: 'custom',
})

/**
 * In development Vite injects CSS from JavaScript, so server-rendered HTML
 * would paint unstyled until the scripts run. Inline every stylesheet the SSR
 * render imported instead. The client removes these copies once its own
 * styles are in place (see `main.tsx`), so hot updates are never shadowed.
 */
async function collectDevStyles() {
  const graph = vite.environments.ssr.moduleGraph
  const entry = await graph.getModuleByUrl('/src/entry-server.tsx')
  const seen = new Set()
  const styles = []
  const visit = (mod) => {
    if (!mod || seen.has(mod)) return
    seen.add(mod)
    if (mod.id && /\.css($|\?)/.test(mod.id)) styles.push(mod)
    for (const imported of mod.importedModules) visit(imported)
  }
  visit(entry)
  const sheets = await Promise.all(
    styles.map(async (mod) => {
      // A virtual stylesheet (Toned's generated CSS) is read from its plugin;
      // a file is requested with `?direct`, which returns the stylesheet text
      // rather than its JavaScript wrapper.
      if (mod.id.startsWith('\0')) {
        const loaded = await vite.environments.client.pluginContainer.load(
          mod.id,
        )
        return typeof loaded === 'string' ? loaded : (loaded?.code ?? '')
      }
      const result = await vite.transformRequest(
        `${mod.url}${mod.url.includes('?') ? '&' : '?'}direct`,
      )
      return result?.code ?? ''
    }),
  )
  return (
    sheets
      .filter(Boolean)
      // A stylesheet has no reason to contain a closing tag; keep it inert anyway.
      .map((css) => css.replace(/<\/style/gi, '<\\/style'))
      .map((css) => `<style data-ssr-dev-style>${css}</style>`)
      .join('\n')
  )
}

async function ssrHandler(req, res) {
  const url = req.originalUrl ?? req.url

  try {
    let template = fs.readFileSync(
      new URL('./index.html', import.meta.url),
      'utf-8',
    )
    template = await vite.transformIndexHtml(url, template)

    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')

    const appHtml = await render(url)

    // A replacer function keeps `$$`/`$&` in rendered code samples literal.
    const html = template
      .replace('<!--app-html-->', () => appHtml)
      .replace('<!--app-head-->', await collectDevStyles())

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
