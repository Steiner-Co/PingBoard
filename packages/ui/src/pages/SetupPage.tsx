import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/icon'
import Eye from '@solar-icons/react/csr/security/Eye'
import EyeClosed from '@solar-icons/react/csr/security/EyeClosed'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth'

export function SetupPage() {
  const { setup } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reveal, setReveal] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <img src="/logomark.png" alt="" className="size-5 rounded-md" />
            <CardTitle>Welcome to PingBoard</CardTitle>
          </div>
          <CardDescription>
            Create your admin account to get started. This account has full
            access — keep the credentials safe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={reveal ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-describedby="setup-password-hint"
                  className="pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                  aria-pressed={reveal}
                  className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-[0.97]"
                >
                  <Icon
                    icon={reveal ? EyeClosed : Eye}
                    className="size-4"
                  />
                </button>
              </div>
              <p
                id="setup-password-hint"
                className={
                  password.length === 0
                    ? 'text-xs text-muted-foreground'
                    : password.length >= 8
                      ? 'text-xs text-success'
                      : 'text-xs text-warning'
                }
              >
                {password.length === 0
                  ? 'At least 8 characters.'
                  : password.length >= 8
                    ? `Looks good — ${password.length} characters.`
                    : `${8 - password.length} more character${8 - password.length === 1 ? '' : 's'} needed.`}
              </p>
              <p className="text-xs text-muted-foreground">
                Store this somewhere safe — recovery needs shell access to the
                container.
              </p>
            </div>
            <p
              id="setup-error"
              role="alert"
              className="min-h-5 text-sm text-destructive"
            >
              {error}
            </p>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create admin account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
