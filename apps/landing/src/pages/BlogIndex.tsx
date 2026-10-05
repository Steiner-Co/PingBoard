import { Seo } from '@/components/Seo'
import { PostCard } from '@/components/blog/BlogChrome'
import { posts } from '@/lib/content'

function RssIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BlogIndex() {
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
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
