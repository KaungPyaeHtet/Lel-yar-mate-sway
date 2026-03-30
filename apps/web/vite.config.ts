import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const __viteDir = nodePath.dirname(fileURLToPath(import.meta.url))

/** Must match `rssUrl` hosts in `@agriora/core` `NEWS_FEED_SOURCES` (vite config cannot import core reliably). */
const RSS_PROXY_HOSTS = new Set([
  'feeds.bbci.co.uk',
  'news.google.com',
  'eng.mizzima.com',
  'www.irrawaddy.com',
])

function rssFetchDevProxy(): import('vite').Plugin {
  return {
    name: 'rss-fetch-dev-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ?? ''
        const path = rawUrl.split('?')[0]
        if (path !== '/api/rss-fetch' || req.method !== 'GET') {
          return next()
        }
        void (async () => {
          let feedUrl: string
          try {
            feedUrl =
              new URL(rawUrl, 'http://vite.local').searchParams.get('url') ??
              ''
          } catch {
            res.statusCode = 400
            res.end('bad query')
            return
          }
          if (!feedUrl) {
            res.statusCode = 400
            res.end('missing url')
            return
          }
          let parsed: URL
          try {
            parsed = new URL(feedUrl)
          } catch {
            res.statusCode = 400
            res.end('invalid url')
            return
          }
          if (parsed.protocol !== 'https:') {
            res.statusCode = 400
            res.end('https only')
            return
          }
          if (!RSS_PROXY_HOSTS.has(parsed.hostname)) {
            res.statusCode = 403
            res.end('host not allowed')
            return
          }
          try {
            const r = await fetch(feedUrl, {
              headers: {
                Accept: 'application/rss+xml, application/xml, text/xml, */*',
                'User-Agent': 'AgrioraWebDev/1.0',
              },
              signal: AbortSignal.timeout(25_000),
            })
            const text = await r.text()
            const ct =
              r.headers.get('content-type')?.split(';')[0]?.trim() ??
              'application/xml'
            res.setHeader('Content-Type', ct)
            res.statusCode = r.status
            res.end(text)
          } catch {
            res.statusCode = 502
            res.end('upstream fetch failed')
          }
        })()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const viteMlUrl = env.VITE_ML_API_URL?.trim() ?? ''
  return {
    define: {
      __AGRIORA_VITE_ML_URL__: JSON.stringify(viteMlUrl),
      __AGRIORA_VITE_DEV__: mode === 'development',
    },
    /**
     * Dev: bundle `@agriora/core` from TypeScript sources so `marketData.generated.ts`
     * updates show up without running `npm run build --workspace=@agriora/core`.
     * Prod: use published `dist` from the package (run `build:core` before `build:web`).
     */
    resolve:
      mode === 'development'
        ? {
            alias: {
              '@agriora/core': nodePath.resolve(
                __viteDir,
                '../../packages/core/src/index.ts'
              ),
            },
          }
        : {},
    plugins: [react(), rssFetchDevProxy()],
    server: {
      /** Listen on all interfaces so phones / other PCs on the LAN can open the dev URL. */
      host: true,
    },
    preview: {
      host: true,
    },
  }
})
