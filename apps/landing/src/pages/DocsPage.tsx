import { Link, Navigate, useParams } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import { Seo } from '@/components/Seo'
import { Prose } from '@/components/Prose'
import { Toc, useToc } from '@/components/docs/Toc'
import { Callout } from '@/components/docs/Callout'
import { Tabs } from '@/components/docs/Tabs'
import { Steps, Step } from '@/components/docs/Steps'
import { useDocsCopyButtons } from '@/components/docs/DocsEnhancements'
import { docs, firstDoc, getDoc } from '@/lib/content'

const mdxComponents = { Callout, Tabs, Steps, Step }

export function DocsRedirect() {
  if (!firstDoc) return <div className="py-16 text-center text-sm text-muted-foreground">No docs yet.</div>
  return <Navigate to={`/docs/${firstDoc.slug}`} replace />
}

function Breadcrumbs({ group, title }: { group: string; title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <Link to="/docs" className="transition-colors hover:text-foreground">
        Docs
      </Link>
      <span aria-hidden className="text-muted-foreground/50">
        /
      </span>
      <span className="text-muted-foreground">{group}</span>
      <span aria-hidden className="text-muted-foreground/50">
        /
      </span>
      <span className="font-medium text-foreground">{title}</span>
    </nav>
  )
}

function DocsPager({ prev, next }: { prev?: { slug: string; title: string }; next?: { slug: string; title: string } }) {
  return (
    <nav aria-label="Pagination" className="mt-12 grid grid-cols-2 gap-3 border-t border-border pt-6">
      {prev ? (
        <Link
          to={`/docs/${prev.slug}`}
          className="group flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-foreground/15 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Previous</span>
          <span className="inline-flex items-center gap-1 text-[13.5px] font-medium leading-[1.3] tracking-[-0.2px] text-foreground">
            <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={`/docs/${next.slug}`}
          className="group flex flex-col items-end gap-1 rounded-xl border border-border bg-card px-4 py-3 text-right transition-colors hover:border-foreground/15 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Next</span>
          <span className="inline-flex items-center gap-1 text-[13.5px] font-medium leading-[1.3] tracking-[-0.2px] text-foreground">
            {next.title}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}

export function DocsPage() {
  const { slug } = useParams<{ slug: string }>()
  const doc = getDoc(slug)

  if (!doc) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-medium text-foreground">Page not found</p>
        <p className="mt-1 text-[13px] text-muted-foreground">The docs page “{slug}” doesn’t exist.</p>
        <Link to="/docs" className="mt-4 inline-flex text-[13px] font-medium text-foreground underline decoration-foreground/20 underline-offset-4 hover:decoration-foreground/40">
          Back to docs
        </Link>
      </div>
    )
  }

  const index = docs.indexOf(doc)
  const prev = index > 0 ? docs[index - 1] : undefined
  const next = index < docs.length - 1 ? docs[index + 1] : undefined
  const { Component } = doc

  return (
    <>
      <Seo title={doc.title} description={doc.description} path={`/docs/${doc.slug}`} />
      <DocsArticle doc={doc} prev={prev} next={next} Component={Component} />
    </>
  )
}

function MobileToc({ items }: { items: { id: string; text: string; level: number }[] }) {
  if (items.length === 0) return null
  return (
    <details className="mb-6 rounded-xl border border-border bg-muted/30 xl:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-medium text-foreground">
        On this page
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3.5 text-muted-foreground" aria-hidden>
          <path d="M6 9 12 15l6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="flex flex-col gap-0.5 border-t border-border px-2 py-2">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className={`block rounded-md px-3 py-1.5 text-[13px] leading-[1.4] text-muted-foreground hover:bg-muted hover:text-foreground ${item.level === 3 ? 'ml-3' : ''}`}
          >
            {item.text}
          </a>
        ))}
      </div>
    </details>
  )
}

function DocsArticle({
  doc,
  prev,
  next,
  Component,
}: {
  doc: { title: string; description: string; group: string; slug: string }
  prev?: { slug: string; title: string }
  next?: { slug: string; title: string }
  Component: React.ComponentType
}) {
  const tocItems = useToc()
  useDocsCopyButtons()

  return (
    <div className="flex items-start gap-8 xl:gap-10">
      {/* ── Article ── */}
      <article className="min-w-0 flex-1 py-6 lg:py-8">
        <Breadcrumbs group={doc.group} title={doc.title} />

        <header className="mt-4">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.7px] text-foreground lg:text-[32px]">{doc.title}</h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-muted-foreground">{doc.description}</p>
        </header>

        <div className="mt-6">
          <MobileToc items={tocItems} />
        </div>

        <div data-docs-article className="mt-8">
          <MDXProvider components={mdxComponents}>
            <Prose variant="docs">
              <Component />
            </Prose>
          </MDXProvider>
        </div>

        <DocsPager prev={prev} next={next} />

        <div className="mt-8 flex items-center gap-4 border-t border-border pt-6 text-[12.5px] text-muted-foreground">
          <a
            href={`https://github.com/Steiner-Co/PingBoard/blob/main/apps/landing/src/content/docs/${doc.slug}.mdx`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3.5" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" strokeLinejoin="round" />
            </svg>
            Edit on GitHub
          </a>
          <span className="text-border">·</span>
          <span>Found an issue? Open a PR.</span>
        </div>
      </article>

      {/* ── Right TOC — desktop only ── */}
      <aside className="hidden w-[180px] shrink-0 xl:block">
        <div className="sticky top-[4.5rem] max-h-[calc(100vh-5rem)] overflow-y-auto py-8">
          <Toc items={tocItems} />
        </div>
      </aside>
    </div>
  )
}
