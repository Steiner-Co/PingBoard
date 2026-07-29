import type { ComponentType } from 'react'

/**
 * Content system for the landing app.
 *
 * MDX files live in `src/content/docs` and `src/content/blog`. Each module
 * exports the rendered page as `default` and its frontmatter as `frontmatter`
 * (via remark-mdx-frontmatter). Everything is loaded eagerly at build time so
 * the router and the prerenderer can enumerate every route statically.
 *
 * Note: docs search is intentionally out of scope (future work).
 */

export const DOC_GROUPS = ['Getting started', 'Guides', 'Reference'] as const
export type DocGroup = (typeof DOC_GROUPS)[number]

export interface DocFrontmatter {
  title: string
  description: string
  group: DocGroup
  order: number
}

export interface PostFrontmatter {
  title: string
  description: string
  /** ISO date string, e.g. "2026-07-29". */
  date: string
  author: string
}

interface DocModule {
  default: ComponentType
  frontmatter: DocFrontmatter
}

interface PostModule {
  default: ComponentType
  frontmatter: PostFrontmatter
}

export interface DocEntry extends DocFrontmatter {
  slug: string
  Component: ComponentType
}

export interface PostEntry extends PostFrontmatter {
  slug: string
  Component: ComponentType
}

const docModules = import.meta.glob<DocModule>('../content/docs/*.mdx', { eager: true })
const postModules = import.meta.glob<PostModule>('../content/blog/*.mdx', { eager: true })

function slugOf(path: string): string {
  return path.split('/').pop()!.replace(/\.mdx$/, '')
}

/** All docs, ordered by group (DOC_GROUPS order) then frontmatter `order`. */
export const docs: DocEntry[] = Object.entries(docModules)
  .map(([path, mod]) => ({ slug: slugOf(path), Component: mod.default, ...mod.frontmatter }))
  .sort(
    (a, b) =>
      DOC_GROUPS.indexOf(a.group) - DOC_GROUPS.indexOf(b.group) || a.order - b.order,
  )

/** All blog posts, newest first. */
export const posts: PostEntry[] = Object.entries(postModules)
  .map(([path, mod]) => ({ slug: slugOf(path), Component: mod.default, ...mod.frontmatter }))
  .sort((a, b) => b.date.localeCompare(a.date))

export function getDoc(slug: string | undefined): DocEntry | undefined {
  return docs.find((d) => d.slug === slug)
}

export function getPost(slug: string | undefined): PostEntry | undefined {
  return posts.find((p) => p.slug === slug)
}

/** Docs grouped for the sidebar, preserving DOC_GROUPS order. */
export function docsByGroup(): { group: DocGroup; items: DocEntry[] }[] {
  return DOC_GROUPS.map((group) => ({
    group,
    items: docs.filter((d) => d.group === group),
  })).filter(({ items }) => items.length > 0)
}

/** First doc in reading order — the target of the `/docs` redirect. */
export const firstDoc: DocEntry | undefined = docs[0]

export function formatDate(iso: string): string {
  // Parse as UTC noon to avoid timezone shifting the calendar day.
  const date = new Date(`${iso}T12:00:00Z`)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
