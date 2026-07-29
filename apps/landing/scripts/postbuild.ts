/**
 * Postbuild: emits dist/sitemap.xml (all routes), dist/rss.xml (blog posts)
 * and dist/robots.txt after `vite build`. Run with bun — no extra deps;
 * frontmatter is read straight from the MDX source files.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SITE_URL } from '../src/lib/site'

const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const DOCS_DIR = resolve(ROOT, 'src/content/docs')
const BLOG_DIR = resolve(ROOT, 'src/content/blog')

function mdxFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.mdx'))
  } catch {
    return []
  }
}

/** Minimal frontmatter reader for flat `key: value` pairs (quoted or bare). */
function parseFrontmatter(file: string): Record<string, string> {
  const src = readFileSync(file, 'utf8')
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (!m) continue
    data[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return data
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const docSlugs = mdxFiles(DOCS_DIR).map((f) => f.replace(/\.mdx$/, ''))
const posts = mdxFiles(BLOG_DIR)
  .map((f) => ({ slug: f.replace(/\.mdx$/, ''), ...parseFrontmatter(resolve(BLOG_DIR, f)) }))
  .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

const staticRoutes = ['/', '/about', '/docs', '/blog']
const routes = [
  ...staticRoutes,
  ...docSlugs.map((s) => `/docs/${s}`),
  ...posts.map((p) => `/blog/${p.slug}`),
]

// --- sitemap.xml ---
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${SITE_URL}${r}</loc></url>`).join('\n')}
</urlset>
`

// --- rss.xml ---
const items = posts
  .map(
    (p) => `    <item>
      <title>${escapeXml(p.title ?? p.slug)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid>${SITE_URL}/blog/${p.slug}</guid>
      <description>${escapeXml(p.description ?? '')}</description>${p.author ? `\n      <author>${escapeXml(p.author)}</author>` : ''}${p.date ? `\n      <pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>` : ''}
    </item>`,
  )
  .join('\n')

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PingBoard Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>News and notes from the PingBoard project.</description>
${items}
  </channel>
</rss>
`

// --- robots.txt ---
const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap)
writeFileSync(resolve(DIST, 'rss.xml'), rss)
writeFileSync(resolve(DIST, 'robots.txt'), robots)

console.log(`postbuild: wrote sitemap.xml (${routes.length} routes), rss.xml (${posts.length} posts), robots.txt`)
