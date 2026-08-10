import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { formatDate, posts, type PostEntry } from '@/lib/content'

function RssIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

function PostMeta({ post, className }: { post: PostEntry; className?: string }) {
  return (
    <p className={className ?? 'text-[12px] leading-[1.35] text-muted-foreground'}>
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      {' · '}
      {post.author}
    </p>
  )
}

/** Latest post gets the full-width feature treatment. */
function FeaturedPost({ post }: { post: PostEntry }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-background p-6 outline-none transition-colors duration-150 ease-out hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]"
    >
      <PostMeta post={post} />
      <h2 className="text-[22px] font-medium leading-[1.15] tracking-[-0.55px] text-balance text-foreground">
        {post.title}
      </h2>
      <p className="text-[14px] leading-[1.5] tracking-[-0.35px] text-foreground/60">
        {post.description}
      </p>
      <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
        Read post
        <ArrowIcon className="size-3.5 transition-transform duration-150 ease-out motion-safe:group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/** Older posts: quiet, divided rows. */
function PostRow({ post }: { post: PostEntry }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex items-baseline justify-between gap-6 border-t border-border py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <span className="flex min-w-0 flex-col gap-1.5">
        <PostMeta post={post} className="text-[12px] leading-[1.35] text-muted-foreground" />
        <span className="text-[16px] font-medium leading-[1.25] tracking-[-0.4px] text-foreground transition-colors duration-150 group-hover:text-primary">
          {post.title}
        </span>
        <span className="line-clamp-2 text-[13px] leading-[1.45] tracking-[-0.3px] text-foreground/60">
          {post.description}
        </span>
      </span>
      <ArrowIcon className="size-4 shrink-0 self-center text-foreground/30 transition-[color,translate] duration-150 ease-out group-hover:text-foreground motion-safe:group-hover:translate-x-0.5" />
    </Link>
  )
}

export function BlogIndex() {
  const [featured, ...rest] = posts

  return (
    <>
      <Seo
        title="Blog"
        description="News and notes from the PingBoard project."
        path="/blog"
      />
      <div className="flex w-full flex-col gap-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-[28px] font-medium leading-[1.02] tracking-[-0.7px] text-foreground">
              Blog
            </h1>
            <p className="max-w-[400px] text-[14px] leading-[1.35] tracking-[-0.35px] text-foreground/60">
              News and notes from the PingBoard project — releases, design
              decisions, and the occasional postmortem.
            </p>
          </div>
          <a
            href="/rss.xml"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-[12px] font-medium text-foreground/60 outline-none transition-colors duration-150 ease-out hover:border-foreground/20 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]"
          >
            <RssIcon className="size-3.5" />
            RSS
          </a>
        </header>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-[14px] font-medium text-foreground">No posts yet</p>
            <p className="text-[13px] text-foreground/60">
              Subscribe to the RSS feed and you won't miss the first one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {featured && <FeaturedPost post={featured} />}
            {rest.length > 0 && (
              <div className="mt-4 flex flex-col">
                {rest.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
