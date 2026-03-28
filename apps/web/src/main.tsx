import { configureNewsRssFetch } from '@agriora/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from "./App.tsx";

if (import.meta.env.DEV) {
  configureNewsRssFetch({
    rewriteDirectFetchUrl: (rssUrl) =>
      `/api/rss-fetch?url=${encodeURIComponent(rssUrl)}`,
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
