import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './App.module.css'
import { Floor } from './components/Floor'
import { SidePanel } from './components/SidePanel'
import type { Agent, AgentState, FeedEvent } from './lib/types'
import { connectHubWs, type WsClient } from './lib/ws'

const HUB = (import.meta.env.VITE_HUB_HTTP as string | undefined) ?? ''

function normalizeState(s: string | undefined): AgentState {
  if (s === 'error') return 'error'
  if (s === 'waiting' || s === 'idle') return s === 'waiting' ? 'waiting' : 'idle'
  if (s === 'working' || s === 'thinking' || s === 'busy') return 'working'
  return 'idle'
}

function mapAgent(raw: Record<string, unknown>): Agent {
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.id),
    provider: String(raw.provider ?? 'mock'),
    model: String(raw.model ?? ''),
    state: normalizeState(raw.state as string | undefined),
    statusLine: String(raw.statusLine ?? ''),
    machineId: String(raw.machineId ?? ''),
  }
}

function mapEvent(raw: Record<string, unknown>): FeedEvent {
  const agentId = String(raw.agentId ?? '')
  const kind = String(raw.kind ?? raw.type ?? 'event')
  const text = String(raw.text ?? raw.statusLine ?? kind)
  return {
    id: String(raw.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    at: typeof raw.at === 'number' ? raw.at : Date.now(),
    agentId,
    kind,
    text,
  }
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feed, setFeed] = useState<FeedEvent[]>([])
  const [wsState, setWsState] = useState<'connecting' | 'open' | 'closed'>(
    'connecting',
  )
  const wsRef = useRef<WsClient | null>(null)

  const selected = useMemo(
    () => agents.find((a) => a.id === selectedId) ?? null,
    [agents, selectedId],
  )

  const appendFeed = useCallback((partial: Omit<FeedEvent, 'id' | 'at'>) => {
    setFeed((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          at: Date.now(),
          ...partial,
        },
        ...prev,
      ].slice(0, 80),
    )
  }, [])

  const refreshAgents = useCallback(async () => {
    try {
      const res = await fetch(`${HUB}/agents`)
      if (!res.ok) return
      const data = (await res.json()) as Record<string, unknown>[]
      setAgents(data.map(mapAgent))
    } catch {
      /* hub down */
    }
  }, [])

  useEffect(() => {
    void refreshAgents()
  }, [refreshAgents])

  useEffect(() => {
    const client = connectHubWs({
      onOpen: () => {
        setWsState('open')
        void refreshAgents()
      },
      onClose: () => setWsState('closed'),
      onError: () => setWsState('closed'),
      onMessage: (data) => {
        if (!data || typeof data !== 'object') return
        const msg = data as {
          type?: string
          agent?: Record<string, unknown>
          event?: Record<string, unknown>
        }
        if (msg.type === 'agent.updated' && msg.agent) {
          const mapped = mapAgent(msg.agent)
          setAgents((prev) => {
            const i = prev.findIndex((a) => a.id === mapped.id)
            if (i < 0) return [...prev, mapped]
            const next = [...prev]
            next[i] = { ...next[i], ...mapped }
            return next
          })
        }
        if (msg.type === 'event.appended' && msg.event) {
          setFeed((prev) => [mapEvent(msg.event!), ...prev].slice(0, 80))
        }
      },
    })
    wsRef.current = client
    return () => {
      client.close()
      wsRef.current = null
    }
  }, [refreshAgents])

  const sendMessage = (text: string) => {
    if (!selected || !text.trim()) return
    const body = text.trim()
    appendFeed({
      agentId: selected.id,
      kind: 'message.out',
      text: `→ @${selected.name}: ${body}`,
    })
    const payload = { type: 'message.send', to: `@${selected.name}`, text: body }
    if (wsRef.current && wsRef.current.readyState() === WebSocket.OPEN) {
      wsRef.current.send(payload)
      return
    }
    void fetch(`${HUB}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: `@${selected.name}`, text: body }),
    }).catch(() => {
      appendFeed({
        agentId: selected.id,
        kind: 'error',
        text: 'hub unreachable — message not sent',
      })
    })
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <strong>Agent Office</strong>
          <span className={styles.muted}> · floor</span>
        </div>
        <span
          className={styles.badge}
          data-state={wsState}
          title="Hub WebSocket"
        >
          hub: {wsState}
        </span>
      </header>
      <div className={styles.main}>
        <Floor
          agents={agents}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />
        <SidePanel
          agent={selected}
          feed={feed.filter((e) => !selected || e.agentId === selected.id)}
          onClose={() => setSelectedId(null)}
          onSend={sendMessage}
        />
      </div>
    </div>
  )
}
