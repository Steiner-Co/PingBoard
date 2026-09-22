import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft'
import { CheckCircle } from '@phosphor-icons/react/dist/icons/CheckCircle'
import { Copy } from '@phosphor-icons/react/dist/icons/Copy'
import { AuthLayout } from '@/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

/** Container name matches the one in compose.yaml / the README. */
const RESET_COMMAND = 'docker exec pingboard pingboard reset-password <your-email>'

export function ForgotPasswordPage() {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(RESET_COMMAND)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            PingBoard is self-hosted, so there is no email reset. Run this on the
            host that runs your container.
          </p>
        </div>

        <button
          type="button"
          onClick={copy}
          aria-label="Copy the reset command"
          className="flex w-full items-start justify-between gap-3 rounded-md border border-border/70 bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <code className="min-w-0 font-mono text-xs break-all text-foreground">
            {RESET_COMMAND}
          </code>
          <Icon
            icon={copied ? CheckCircle : Copy}
            className={cn(
              'mt-0.5 size-4 shrink-0 transition-colors',
              copied ? 'text-success-text' : 'text-muted-foreground',
            )}
          />
          <span className="sr-only">{copied ? 'Copied' : 'Copy'}</span>
        </button>

        <p className="text-xs/relaxed text-muted-foreground">
          A new random password is generated — sign in with it, then change it
          from Settings. If your container has a different name, swap it into the
          command.
        </p>

        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to="/login">
            <Icon icon={ArrowLeft} className="size-3.5" />
            Back to sign in
          </Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
