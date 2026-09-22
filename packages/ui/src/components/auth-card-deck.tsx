import { useCallback, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, type PanInfo, type Transition } from 'motion/react'
import { Bell } from '@phosphor-icons/react/dist/icons/Bell'
import { CheckCircle } from '@phosphor-icons/react/dist/icons/CheckCircle'
import { Warning } from '@phosphor-icons/react/dist/icons/Warning'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

/**
 * Interactable preview deck for the auth brand panel. The front card can be
 * dragged left to send it to the back of the stack, revealing the next one;
 * ArrowLeft/ArrowRight do the same from the keyboard. One-shot springs via
 * Motion, disabled entirely under `prefers-reduced-motion`.
 *
 * The cards themselves are `aria-hidden` mock UI — assistive tech gets the
 * deck label and a polite "card N of M" announcement instead of screenfuls of
 * fake uptime numbers.
 */

const SPRING: Transition = { type: 'spring', stiffness: 260, damping: 30 }
/** Drag distance / velocity past which a card commits to the back. */
const COMMIT_PX = 72
const COMMIT_VELOCITY = 420

const UPTIME_DAYS = [
  'up', 'up', 'up', 'up', 'up', 'degraded', 'up', 'up', 'up', 'up',
  'up', 'up', 'up', 'down', 'up', 'up', 'up', 'up', 'up', 'up',
  'up', 'degraded', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up',
] as const

const MOCK_MONITORS = [
  { name: 'Website', ms: 209 },
  { name: 'API · health', ms: 70 },
  { name: 'Primary database', ms: 54 },
] as const

const INCIDENT_TIMELINE = [
  { time: '09:12', text: 'Mitigation deployed, latency recovering' },
  { time: '09:04', text: 'Root cause identified upstream' },
  { time: '08:58', text: 'Investigating elevated p95' },
  { time: '08:47', text: 'Alerts firing on p95 > 800 ms' },
] as const

const CHANNELS = ['Discord', 'Slack', 'Email', 'Webhook', 'ntfy'] as const

function StatusCard() {
  return (
    <Card className="h-full justify-between pt-6 pb-7 shadow-lg">
      <CardHeader className="gap-1 px-6">
        <span className="flex items-center gap-2 text-xs/relaxed text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-success motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Live status
        </span>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={CheckCircle} className="size-4 text-success-text" />
          All systems operational
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-6">
        <div className="flex items-center justify-between gap-2 text-xs/relaxed">
          <span className="text-muted-foreground">Last 30 days</span>
          <span className="font-mono tabular-nums text-success-text">99.98%</span>
        </div>

        <div className="flex items-end gap-[3px]">
          {UPTIME_DAYS.map((day, i) => (
            <span
              key={i}
              className={cn(
                'h-6 flex-1 rounded-full',
                day === 'up' && 'bg-success',
                day === 'degraded' && 'bg-warning',
                day === 'down' && 'bg-destructive',
              )}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {MOCK_MONITORS.map((monitor) => (
            <div
              key={monitor.name}
              className="flex items-center justify-between gap-2 text-xs/relaxed"
            >
              <span className="truncate text-foreground">{monitor.name}</span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                {monitor.ms} ms
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function IncidentCard() {
  return (
    <Card className="h-full justify-between pt-6 pb-7 shadow-lg">
      <CardHeader className="gap-1 px-6">
        <span className="flex items-center gap-2 text-xs/relaxed text-muted-foreground">
          <span className="size-2 rounded-full bg-warning" />
          Incident · investigating
        </span>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={Warning} className="size-4 text-warning" />
          Elevated API latency
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-6">
        <div className="flex items-center justify-between gap-2 text-xs/relaxed">
          <Badge variant="secondary">1 monitor affected</Badge>
          <span className="font-mono tabular-nums text-muted-foreground">14m</span>
        </div>
        {INCIDENT_TIMELINE.map((entry) => (
          <div key={entry.time} className="flex gap-3 text-xs/relaxed">
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
              {entry.time}
            </span>
            <span className="text-foreground">{entry.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ChannelsCard() {
  return (
    <Card className="h-full justify-between pt-6 pb-7 shadow-lg">
      <CardHeader className="gap-1 px-6">
        <span className="text-xs/relaxed text-muted-foreground">Notifications</span>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={Bell} className="size-4 text-primary-text" />
          5 channels configured
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-6">
        {CHANNELS.map((channel) => (
          <div
            key={channel}
            className="flex items-center justify-between gap-2 text-xs/relaxed"
          >
            <span className="text-foreground">{channel}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Icon icon={CheckCircle} className="size-3.5 text-success-text" />
              connected
            </span>
          </div>
        ))}
        <p className="text-xs/relaxed text-muted-foreground">
          Fires on both down and recovery.
        </p>
      </CardContent>
    </Card>
  )
}

const PREVIEWS: { id: string; label: string; render: () => ReactNode }[] = [
  { id: 'status', label: 'Public status page', render: () => <StatusCard /> },
  { id: 'incident', label: 'Incident timeline', render: () => <IncidentCard /> },
  { id: 'channels', label: 'Notification channels', render: () => <ChannelsCard /> },
]

/**
 * Stack transform by deck position — `0` front, higher is deeper. Back cards
 * sit down-and-left so a leftward drag tucks the front card away in the same
 * direction the user is pushing it.
 */
function stackAt(position: number) {
  return {
    x: -position * 18,
    y: position * 12,
    rotate: -1 + position * 2.2,
    scale: 1 - position * 0.04,
    opacity: 1 - position * 0.12,
  }
}

export function AuthCardDeck() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const count = PREVIEWS.length
  const transition: Transition = reduced ? { duration: 0 } : SPRING

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  )

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="PingBoard highlights"
      aria-describedby="auth-deck-help"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          go(1)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          go(-1)
        }
      }}
      className="relative h-[272px] w-full max-w-md rounded-xl select-none outline-none [zoom:0.8] focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <p id="auth-deck-help" className="sr-only">
        Use the left and right arrow keys to browse the highlights.
      </p>

      {PREVIEWS.map((preview, i) => {
        const position = (i - index + count) % count
        const front = position === 0
        return (
          <motion.div
            key={preview.id}
            aria-hidden="true"
            className={cn(
              'absolute inset-0',
              front && 'cursor-grab active:cursor-grabbing',
            )}
            style={{ zIndex: count - position, touchAction: front ? 'pan-y' : undefined }}
            initial={false}
            animate={stackAt(position)}
            transition={transition}
            drag={front ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={(_event, info: PanInfo) => {
              if (info.offset.x < -COMMIT_PX || info.velocity.x < -COMMIT_VELOCITY) go(1)
              else if (info.offset.x > COMMIT_PX || info.velocity.x > COMMIT_VELOCITY) go(-1)
            }}
          >
            {preview.render()}
            {/* Back cards are a stack surface, not readable content — a cover
                in the card's own colour keeps their text fragments from
                peeking past the front card. Fades as a card moves forward. */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-lg bg-card ring-1 ring-foreground/10"
              initial={false}
              animate={{ opacity: front ? 0 : 1 }}
              transition={transition}
            />
          </motion.div>
        )
      })}

      <p className="sr-only" aria-live="polite">
        {PREVIEWS[index]?.label} — card {index + 1} of {count}
      </p>
    </div>
  )
}
