import { useState } from 'react'
import { Wordmark } from '@/components/logo'
import { CheckIcon, CopyIcon, DockerIcon } from '@/components/icons'

const CMD = 'docker run -d -p 3000:3000 -v pingboard_data:/data ghcr.io/steiner-co/pingboard'

export function FooterCTA() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CMD)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <section className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Wordmark />
        <p className="text-[20px] font-medium tracking-[-0.5px] text-foreground">
          Get started today.
        </p>
      </div>

      <div className="flex w-full max-w-[470px] items-center gap-2 rounded-[12px] border border-border bg-muted p-1.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-card">
          <DockerIcon className="size-4 text-foreground/70" />
        </div>
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-foreground/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CMD}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy install command"
          className="flex size-8 shrink-0 items-center justify-center rounded-[8px] outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.98]"
        >
          {copied ? (
            <CheckIcon className="size-4 text-success" />
          ) : (
            <CopyIcon className="size-4 text-foreground/60" />
          )}
        </button>
      </div>
    </section>
  )
}
