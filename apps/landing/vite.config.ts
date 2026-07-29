import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/** Slugs of every MDX page, so each one gets its own prerendered HTML file. */
function contentSlugs(dir: string): string[] {
  try {
    return readdirSync(resolve(__dirname, dir))
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace(/\.mdx$/, ''))
  } catch {
    return []
  }
}

const docSlugs = contentSlugs('src/content/docs')
const postSlugs = contentSlugs('src/content/blog')

export default defineConfig({
  plugins: [
    // MDX must run before the React plugin so .mdx files become JSX first.
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          [
            rehypePrettyCode,
            {
              // Dual themes emit --shiki-light/--shiki-dark CSS vars;
              // globals.css switches on the `.dark` class.
              theme: { light: 'github-light-default', dark: 'github-dark-default' },
              keepBackground: false,
            },
          ],
        ],
      }),
    },
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  ssgOptions: {
    entry: 'src/main.tsx',
    includedRoutes() {
      return [
        '/',
        '/about',
        '/docs',
        ...docSlugs.map((s) => `/docs/${s}`),
        '/blog',
        ...postSlugs.map((s) => `/blog/${s}`),
      ]
    },
  },
})
