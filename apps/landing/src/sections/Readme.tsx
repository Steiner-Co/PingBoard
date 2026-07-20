import { useState } from 'react'

const installs = {
  docker: { prefix: 'docker', rest: ' run -d -p 3000:3000 -v pingboard_data:/data ghcr.io/steiner-co/pingboard' },
  compose: { prefix: 'curl', rest: ' -fsSL get.pingboard.dev | sh' },
  source: { prefix: 'git', rest: ' clone github.com/steiner-co/pingboard && bun install && bun dev' },
}

type InstallKey = keyof typeof installs

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function Readme() {
  const [tab, setTab] = useState<InstallKey>('docker')
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const current = installs[tab]
  const fullCmd = current.prefix + current.rest
  const copied = status === 'copied'

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCmd)
      setStatus('copied')
      window.setTimeout(() => setStatus('idle'), 1400)
    } catch {
      // Clipboard can reject (insecure context, denied permission). Say so
      // rather than leaving the button looking like it worked.
      setStatus('error')
      window.setTimeout(() => setStatus('idle'), 2400)
    }
  }

  return (
    <section id="readme" className="border-b border-border/60 px-8 py-12 sm:px-12 lg:px-16">
      <div className="mb-6 text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        README
      </div>

      <p className="max-w-3xl text-[0.9375rem] leading-relaxed text-muted-foreground">
        Uptime monitoring that lives <span className="text-foreground">inside your infra</span>. Single binary,
        plugin-based, and built to scale — for personal sites, homelabs, and{' '}
        <span className="text-foreground">production stacks</span>.
      </p>

      <div className="mt-10 rounded-md border border-border/60">
        <div className="flex items-stretch border-b border-border/60">
          {(Object.keys(installs) as InstallKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key)
                setStatus('idle')
              }}
              className={
                'relative flex items-center px-4 py-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] transition-colors hover:text-foreground' +
                (tab === key
                  ? ' text-foreground after:absolute after:inset-x-3 after:bottom-[-1px] after:h-[2px] after:bg-foreground'
                  : ' text-muted-foreground')
              }
            >
              {key === 'docker' ? 'Docker' : key === 'compose' ? 'Quickstart' : 'Source'}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <pre className="overflow-x-auto font-mono text-sm text-foreground/90">
            <span className="text-success">{current.prefix}</span>
            <span className="text-foreground/85">{current.rest}</span>
          </pre>
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy command"
            className="shrink-0 rounded-md border border-transparent p-1.5 text-muted-foreground transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out hover:border-border hover:text-foreground active:scale-[0.97]"
          >
            <CopyIcon copied={copied} />
          </button>
        </div>

        <span aria-live="polite" className="sr-only">
          {status === 'copied' ? 'Copied' : status === 'error' ? 'Copy failed' : ''}
        </span>
      </div>
    </section>
  )
}
