import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth'

export function LoginPage() {
  const { login } = useAuth()
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
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      // Focus lands on <body> after a failed submit otherwise, ejecting
      // keyboard users from the form they were just in.
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
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
            <CardTitle>Sign in</CardTitle>
          </div>
          <CardDescription>Welcome back to PingBoard.</CardDescription>
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
                aria-describedby={error ? 'login-error' : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <p
              id="login-error"
              role="alert"
              className="min-h-5 text-sm text-destructive"
            >
              {error}
            </p>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-1">
              Forgot your password? Run{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-foreground">
                docker exec pingboard pingboard reset-password &lt;email&gt;
              </code>{' '}
              from the host.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
