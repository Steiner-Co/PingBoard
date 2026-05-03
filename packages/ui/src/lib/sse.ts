import { useEffect } from 'react'

export interface SseHandlers {
  heartbeat?: (payload: HeartbeatPayload) => void
  'incident.opened'?: (payload: IncidentPayload) => void
  'incident.resolved'?: (payload: IncidentPayload) => void
}

export interface HeartbeatPayload {
  monitorId: string
  result: {
    status: 'up' | 'down' | 'degraded'
    responseTimeMs: number | null
    statusCode: number | null
    message: string | null
    checkedAt: string
  }
}

export interface IncidentPayload {
  incidentId: string
  monitorId: string
  startedAt: string
  resolvedAt?: string
}

export function useSSE(url: string, handlers: SseHandlers): void {
  useEffect(() => {
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const connect = () => {
      if (stopped) return
      source = new EventSource(url, { withCredentials: true })

      for (const [event, handler] of Object.entries(handlers)) {
        if (!handler) continue
        source.addEventListener(event, (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data)
            ;(handler as (payload: unknown) => void)(data)
          } catch (err) {
            console.error('SSE parse error', err)
          }
        })
      }

      source.onerror = () => {
        source?.close()
        source = null
        if (!stopped) {
          reconnectTimer = setTimeout(connect, 2000)
        }
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      source?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
}
