import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Instance-wide preferences.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>You're signed in as the admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <span className="text-muted-foreground">Email:</span>{' '}
            <span className="font-mono">{user?.email}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            To reset the admin password, run{' '}
            <code className="px-1 py-0.5 bg-muted rounded text-foreground">
              docker exec pingboard pingboard reset-password {user?.email}
            </code>{' '}
            from the host.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retention</CardTitle>
          <CardDescription>
            Heartbeats older than 30 days are aggregated into daily stats. This is fixed in v1.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
