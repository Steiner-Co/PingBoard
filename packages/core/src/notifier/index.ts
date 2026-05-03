import { eq, inArray } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import {
  incidents,
  monitorChannels,
  monitors,
  notificationChannels,
} from '@pingboard/db'
import { events } from '../events'
import type { ChannelDriver, IncidentStatus, NotificationPayload } from './types'
import { emailDriver } from './email'
import { webhookDriver } from './webhook'
import { discordDriver } from './discord'
import { slackDriver } from './slack'
import { ntfyDriver } from './ntfy'

const drivers: Record<string, ChannelDriver> = {
  email: emailDriver as unknown as ChannelDriver,
  webhook: webhookDriver as unknown as ChannelDriver,
  discord: discordDriver as unknown as ChannelDriver,
  slack: slackDriver as unknown as ChannelDriver,
  ntfy: ntfyDriver as unknown as ChannelDriver,
}

export interface NotifierOptions {
  baseUrl: string | null
}

export function startNotifier(db: DB, opts: NotifierOptions): { stop: () => void } {
  const handleOpened = (e: { incidentId: string; monitorId: string }) =>
    void dispatch(db, e.monitorId, e.incidentId, 'opened', opts.baseUrl).catch(
      (err) => console.error('Notifier dispatch failed:', err),
    )
  const handleResolved = (e: { incidentId: string; monitorId: string }) =>
    void dispatch(db, e.monitorId, e.incidentId, 'resolved', opts.baseUrl).catch(
      (err) => console.error('Notifier dispatch failed:', err),
    )

  events.on('incident.opened', handleOpened)
  events.on('incident.resolved', handleResolved)

  return {
    stop: () => {
      events.off('incident.opened', handleOpened)
      events.off('incident.resolved', handleResolved)
    },
  }
}

export async function sendTest(
  channel: { type: string; config: unknown },
): Promise<void> {
  const driver = drivers[channel.type]
  if (!driver) throw new Error(`Unknown channel type: ${channel.type}`)
  await driver.testConfig(channel.config as never)
}

async function dispatch(
  db: DB,
  monitorId: string,
  incidentId: string,
  status: IncidentStatus,
  baseUrl: string | null,
): Promise<void> {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, monitorId))
  if (!monitor) return
  const [incident] = await db
    .select()
    .from(incidents)
    .where(eq(incidents.id, incidentId))
  if (!incident) return

  const links = await db
    .select({ channelId: monitorChannels.channelId })
    .from(monitorChannels)
    .where(eq(monitorChannels.monitorId, monitorId))
  if (links.length === 0) return

  const channelIds = links.map((l) => l.channelId)
  const channels = await db
    .select()
    .from(notificationChannels)
    .where(inArray(notificationChannels.id, channelIds))

  const payload: NotificationPayload = { status, monitor, incident, baseUrl }
  await Promise.allSettled(
    channels
      .filter((c) => c.enabled)
      .map(async (c) => {
        const driver = drivers[c.type]
        if (!driver) return
        try {
          await driver.send(c.config as never, payload)
        } catch (err) {
          console.error(`Channel ${c.id} (${c.type}) failed:`, err)
        }
      }),
  )
}

export { emailDriver, webhookDriver, discordDriver, slackDriver, ntfyDriver }
export type { ChannelDriver, NotificationPayload, IncidentStatus } from './types'
