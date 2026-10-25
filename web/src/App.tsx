import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './App.module.css'
import { Floor } from './components/Floor'
import { SidePanel } from './components/SidePanel'
import { Composer } from './components/Composer'
import type { Chatter } from './components/Floor'
import { INITIAL_AGENTS, MOCK_CHATTER, nextStatusLine } from './lib/mockAgents'
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
    room: raw.room ? String(raw.room) : undefined,
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
  const composerRef = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState('@all')
  const [goal, setGoal] = useState<string | null>(null)
  const [hubAgents, setHubAgents] = useState(false)

  // Offline demo: seed mock agents if hub gives none
  useEffect(() => {
    const t = setTimeout(() => setAgents((p) => (p.length ? p : INITIAL_AGENTS)), 1200)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (hubAgents) return
    const i = setInterval(() => {
      setAgents((p) => p.map((a) => (a.provider === 'mock' && a.state === 'working' ? { ...a, statusLine: nextStatusLine(a.id, a.statusLine) } : a)))
    }, 4000)
    return () => clearInterval(i)
  }, [hubAgents])
  useEffect(() => {
    fetch(`${HUB}/goal`).then((r) => (r.ok ? r.json() : null)).then((g) => {
      const v = g && (typeof g === 'string' ? g : g.text ?? g.goal ?? g.title)
      if (v) setGoal(String(v))
    }).catch(() => {})
  }, [])
  const chatter = useMemo<Chatter[]>(() => {
    const names = agents.map((a) => a.name)
    const fromFeed: Chatter[] = []
    for (const e of feed) {
      const m = e.text.match(/@?(\w+)\s*(?:→|->)\s*@?(\w+):?\s*(.*)/)
      if (m && names.includes(m[1]) && names.includes(m[2])) fromFeed.push({ from: m[1], to: m[2], text: m[3].slice(0, 24) })
      if (fromFeed.length >= 3) break
    }
    return fromFeed.length ? fromFeed : MOCK_CHATTER
  }, [feed, agents])

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
      if (Array.isArray(data) && data.length) {
        setAgents(data.map(mapAgent))
        setHubAgents(true)
      }
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

  const sendMessage = (to: string, body: string) => {
    const agent = agents.find((a) => `@${a.name}` === to)
    const agentId = agent?.id ?? selected?.id ?? 'all'
    appendFeed({ agentId, kind: 'message.out', text: `→ ${to}: ${body}` })
    const payload = { type: 'message.send', to, text: body }
    if (wsRef.current && wsRef.current.readyState() === WebSocket.OPEN) {
      wsRef.current.send(payload)
      return
    }
    void fetch(`${HUB}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text: body }),
    })
      .then((r) => {
        if (!r.ok) throw new Error()
      })
      .catch(() => appendFeed({ agentId, kind: 'error', text: 'hub unreachable — message not sent' }))
  }

  const select = (id: string) => {
    setSelectedId(id)
    const a = agents.find((x) => x.id === id)
    if (a) setTarget(`@${a.name}`)
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.wordmark}>AGENT OFFICE</span>
        {goal && <span className={styles.goal}><span className={styles.muted}>Goal</span> {goal}</span>}
        <span className={styles.badge} data-state={wsState} title="Hub WebSocket">
          ● hub {wsState}{!hubAgents && agents.length ? ' · demo' : ''}
        </span>
      </header>
      <div className={styles.main}>
        <Floor agents={agents} chatter={chatter} selectedId={selectedId} onSelect={select} />
        <SidePanel
          agent={selected}
          feed={feed.filter((e) => !selected || e.agentId === selected.id || e.agentId === 'all')}
          onClose={() => setSelectedId(null)}
          onMessage={() => composerRef.current?.focus()}
        />
      </div>
      <Composer ref={composerRef} agents={agents} target={target} onTarget={setTarget} onSend={sendMessage} />
    </div>
  )
}
