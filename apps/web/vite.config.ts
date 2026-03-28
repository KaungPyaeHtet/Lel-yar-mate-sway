import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
export default defineConfig({
  plugins: [react(), rssFetchDevProxy()],
})
