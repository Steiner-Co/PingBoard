import { events, type PingBoardEvents } from '@pingboard/core'

type EventName = keyof PingBoardEvents

export interface SseStreamOptions {
  /** If provided, only events whose payload matches this filter pass through. */
  filter?: (event: EventName, payload: unknown) => boolean
}

export function createSseResponse(opts: SseStreamOptions = {}): Response {
  const encoder = new TextEncoder()
  let cleanup: (() => void) | undefined

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: EventName, payload: unknown) => {
        if (opts.filter && !opts.filter(event, payload)) return
        const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // Stream closed
        }
      }

      const handlers: Array<{
        name: EventName
        handler: (...args: unknown[]) => void
      }> = []

      const eventNames: EventName[] = [
        'heartbeat',
        'incident.opened',
        'incident.resolved',
      ]
      for (const name of eventNames) {
        const handler = (payload: unknown) => send(name, payload)
        events.on(name, handler as never)
        handlers.push({ name, handler: handler as never })
      }

      // Initial comment to flush headers and keep connection open
      controller.enqueue(encoder.encode(': connected\n\n'))

      // Heartbeat to keep proxies happy
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(ping)
        }
      }, 25_000)

      cleanup = () => {
        clearInterval(ping)
        for (const { name, handler } of handlers) {
          events.off(name, handler as never)
        }
      }
    },
    // Runs when the client disconnects. Without this every dropped connection
    // leaked its ping timer and three EventEmitter listeners.
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
      connection: 'keep-alive',
    },
  })
}
