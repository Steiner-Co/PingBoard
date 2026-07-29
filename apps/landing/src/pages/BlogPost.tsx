import { Link, useParams } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { Prose } from '@/components/Prose'
import { formatDate, getPost, posts } from '@/lib/content'
import { NotFound } from './NotFound'

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const post = getPost(slug)
  if (!post) return <NotFound />

  const { Component } = post
  // posts are newest-first: index - 1 is newer, index + 1 is older
  const index = posts.findIndex((p) => p.slug === post.slug)
  const newer = index > 0 ? posts[index - 1] : undefined
  const older = index < posts.length - 1 ? posts[index + 1] : undefined

  const backLinkClass =
    'w-fit rounded-[4px] text-[12px] font-medium text-foreground/40 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30'

  return (
    <>
      <Seo title={post.title} description={post.description} path={`/blog/${post.slug}`} type="article" />
      <article className="w-full">
        <header className="mb-10 flex flex-col gap-5">
          <Link to="/blog" className={backLinkClass}>
            ← All posts
          </Link>
          <div className="flex flex-col gap-3">
            <h1 className="text-[28px] font-medium leading-[1.08] tracking-[-0.7px] text-balance text-foreground">
              {post.title}
            </h1>
            <p className="text-[13px] leading-[1.35] text-foreground/40">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {' · '}
              {post.author}
            </p>
          </div>
        </header>

        <Prose>
          <Component />
        </Prose>

        <footer className="mt-14 flex flex-col gap-6 border-t border-border pt-6">
          {(newer || older) && (
            <nav aria-label="More posts" className="flex items-start justify-between gap-6">
              {older ? (
                <Link
                  to={`/blog/${older.slug}`}
                  className="group flex max-w-[45%] flex-col gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <span className="text-[12px] text-foreground/40">← Older</span>
                  <span className="text-[14px] font-medium leading-[1.3] tracking-[-0.35px] text-foreground/80 transition-colors duration-150 group-hover:text-foreground">
                    {older.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {newer ? (
                <Link
                  to={`/blog/${newer.slug}`}
                  className="group flex max-w-[45%] flex-col items-end gap-1 text-right outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <span className="text-[12px] text-foreground/40">Newer →</span>
                  <span className="text-[14px] font-medium leading-[1.3] tracking-[-0.35px] text-foreground/80 transition-colors duration-150 group-hover:text-foreground">
                    {newer.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
          <Link to="/blog" className={backLinkClass}>
            ← All posts
          </Link>
        </footer>
      </article>
    </>
  )
}
