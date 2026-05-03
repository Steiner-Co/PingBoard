import { EventEmitter } from 'node:events'
import type { CheckResult } from '@pingboard/shared'

export interface HeartbeatEvent {
  monitorId: string
  result: CheckResult
}

export interface IncidentOpenedEvent {
  incidentId: string
  monitorId: string
  startedAt: Date
}

export interface IncidentResolvedEvent {
  incidentId: string
  monitorId: string
  startedAt: Date
  resolvedAt: Date
}

export interface PingBoardEvents {
  heartbeat: [HeartbeatEvent]
  'incident.opened': [IncidentOpenedEvent]
  'incident.resolved': [IncidentResolvedEvent]
}

export const events = new EventEmitter<PingBoardEvents>()
