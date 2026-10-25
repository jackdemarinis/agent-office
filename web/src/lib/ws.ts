/** Stub WS client for hub `/ws`. Reconnect is a no-op-friendly retry. */

export type WsHandlers = {
  onOpen?: () => void
  onClose?: () => void
  onMessage?: (data: unknown) => void
  onError?: (err: Event) => void
}

export type WsClient = {
  send: (payload: unknown) => void
  close: () => void
  readyState: () => number
}

const DEFAULT_URL =
  (import.meta.env.VITE_HUB_WS as string | undefined) ??
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export function connectHubWs(
  handlers: WsHandlers = {},
  url: string = DEFAULT_URL,
): WsClient {
  let ws: WebSocket | null = null
  let closed = false
  let retryMs = 1000

  const connect = () => {
    if (closed) return
    try {
      ws = new WebSocket(url)
    } catch {
      scheduleRetry()
      return
    }

    ws.onopen = () => {
      retryMs = 1000
      handlers.onOpen?.()
      try {
        ws?.send(JSON.stringify({ type: 'subscribe' }))
      } catch {
        /* ignore */
      }
    }

    ws.onmessage = (ev) => {
      try {
        handlers.onMessage?.(JSON.parse(String(ev.data)))
      } catch {
        handlers.onMessage?.(ev.data)
      }
    }

    ws.onerror = (err) => handlers.onError?.(err)

    ws.onclose = () => {
      handlers.onClose?.()
      scheduleRetry()
    }
  }

  const scheduleRetry = () => {
    if (closed) return
    const wait = retryMs
    retryMs = Math.min(retryMs * 2, 15000)
    window.setTimeout(connect, wait)
  }

  connect()

  return {
    send(payload) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload))
      }
    },
    close() {
      closed = true
      ws?.close()
      ws = null
    },
    readyState() {
      return ws?.readyState ?? WebSocket.CLOSED
    },
  }
}
