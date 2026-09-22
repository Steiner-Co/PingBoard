import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/contexts/auth'

export function SetupPage() {
  const { setup } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await setup(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
      emailRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome to PingBoard
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            Create your admin account to get started. This account has full
            access — keep the credentials safe.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'setup-error' : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              aria-describedby="setup-password-hint"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p
              id="setup-password-hint"
              className={
                password.length === 0
                  ? 'text-xs/relaxed text-muted-foreground'
                  : password.length >= 8
                    ? 'text-xs/relaxed text-success-text'
                    : 'text-xs/relaxed text-warning'
              }
            >
              {password.length === 0
                ? 'At least 8 characters.'
                : password.length >= 8
                  ? `Looks good — ${password.length} characters.`
                  : `${8 - password.length} more character${8 - password.length === 1 ? '' : 's'} needed.`}
            </p>
            <p className="text-xs/relaxed text-muted-foreground">
              Store this somewhere safe — recovery needs shell access to the
              container.
            </p>
          </div>

          {error ? (
            <p
              id="setup-error"
              role="alert"
              className="text-xs/relaxed text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create admin account'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}
