import { Link, useParams } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { Prose } from '@/components/Prose'
import { TopNav } from '@/sections/TopNav'
import { SiteFooter } from '@/sections/SiteFooter'
import { SiteLayout } from '@/layouts/SiteLayout'
import { authorMeta, formatDate, getPost, posts } from '@/lib/content'
import { NotFound } from './NotFound'
import {
  AuthorAvatar,
  BlogHero,
  BlogShare,
  BlogToc,
  MobileBlogToc,
  useBlogToc,
  useReadingTime,
} from '@/components/blog/BlogChrome'

function Breadcrumb({ category }: { category: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <Link to="/blog" className="rounded-[4px] outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30">
        Blog
      </Link>
      <span aria-hidden className="text-muted-foreground/50">
        /
      </span>
      <span className="text-foreground">{category}</span>
    </nav>
  )
}

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const post = getPost(slug)
  const tocItems = useBlogToc(post?.slug)
  const minutes = useReadingTime(post?.slug)

  if (!post) return <SiteLayout><NotFound /></SiteLayout>

  const { Component } = post
  // posts are newest-first: index - 1 is newer, index + 1 is older
  const index = posts.findIndex((p) => p.slug === post.slug)
  const newer = index > 0 ? posts[index - 1] : undefined
  const older = index < posts.length - 1 ? posts[index + 1] : undefined

  return (
    <>
      <Seo title={post.title} description={post.description} path={`/blog/${post.slug}`} type="article" />
      <div className="page-dots min-h-screen bg-background text-foreground selection:bg-primary/15">
        <div className="mx-auto flex max-w-[1120px] items-start gap-8 px-4 py-6 sm:px-6 sm:py-10">
          {/* ── Left rail: TOC + share + promo (outside the card, sticky) ── */}
          <aside className="sticky top-8 hidden w-[240px] shrink-0 flex-col gap-8 lg:flex">
            <BlogToc items={tocItems} />
            <BlogShare title={post.title} />
          </aside>

          {/* ── Main card ── */}
          <main className="mx-auto w-full min-w-0 max-w-[720px] flex-1 rounded-[28px] border border-border/70 bg-card p-6 sm:p-10">
            <div className="flex flex-col gap-12">
              <TopNav />

              <article className="w-full">
                <header className="flex flex-col gap-6">
                  <Breadcrumb category={post.category ?? 'News'} />
                  <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.8px] text-balance text-foreground sm:text-[40px]">
                    {post.title}
                  </h1>
                </header>

                <div className="mt-8">
                  <BlogHero seed={post.slug} />
                </div>

                {/* Author + date row */}
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <AuthorAvatar name={post.author} image={authorMeta(post.author).image} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13.5px] font-semibold tracking-[-0.2px] text-foreground">
                        {post.author}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">{authorMeta(post.author).role}</span>
                    </div>
                  </div>
                  <p className="shrink-0 text-[12.5px] tabular-nums text-muted-foreground">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    {minutes != null && (
                      <>
                        {'  ·  '}
                        {minutes} min read
                      </>
                    )}
                  </p>
                </div>

                {/* Mobile TOC + share */}
                <div className="mt-8 flex flex-col gap-4 lg:hidden">
                  <MobileBlogToc items={tocItems} />
                </div>

                <div data-blog-article className="mt-8">
                  <Prose>
                    <Component />
                  </Prose>
                </div>

                {/* Mobile share */}
                <div className="mt-10 lg:hidden">
                  <BlogShare title={post.title} />
                </div>

                <footer className="mt-12 flex flex-col gap-6 border-t border-border pt-6">
                  {(newer || older) && (
                    <nav aria-label="More posts" className="grid gap-3 sm:grid-cols-2">
                      {older ? (
                        <Link
                          to={`/blog/${older.slug}`}
                          className="group flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 outline-none transition-colors hover:border-foreground/15 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30"
                        >
                          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Older</span>
                          <span className="text-[13.5px] font-medium leading-[1.3] tracking-[-0.2px] text-foreground/80 transition-colors group-hover:text-foreground">
                            {older.title}
                          </span>
                        </Link>
                      ) : (
                        <span />
                      )}
                      {newer ? (
                        <Link
                          to={`/blog/${newer.slug}`}
                          className="group flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left outline-none transition-colors hover:border-foreground/15 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30 sm:items-end sm:text-right"
                        >
                          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Newer</span>
                          <span className="text-[13.5px] font-medium leading-[1.3] tracking-[-0.2px] text-foreground/80 transition-colors group-hover:text-foreground">
                            {newer.title}
                          </span>
                        </Link>
                      ) : (
                        <span />
                      )}
                    </nav>
                  )}
                  <Link
                    to="/blog"
                    className="w-fit rounded-[4px] text-[12px] font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    ← All posts
                  </Link>
                </footer>
              </article>

              <SiteFooter />
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
