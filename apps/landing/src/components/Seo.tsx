import { Head } from 'vite-react-ssg'
import { SITE_NAME, SITE_URL } from '@/lib/site'

interface SeoProps {
  /** Page title; `| PingBoard` is appended unless it already contains it. */
  title: string
  description: string
  /** Route path, e.g. `/docs/getting-started` — used for canonical + OG URL. */
  path: string
  type?: 'website' | 'article'
}

/**
 * Per-route <title>/meta/OG tags. Rendered into the prerendered HTML by
 * vite-react-ssg's head support (react-helmet-async under the hood).
 */
export function Seo({ title, description, path, type = 'website' }: SeoProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const url = `${SITE_URL}${path}`
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Head>
  )
}
