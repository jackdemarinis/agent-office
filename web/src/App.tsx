import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './App.module.css'
import { Floor } from './components/Floor'
import { SidePanel } from './components/SidePanel'
import { Composer } from './components/Composer'
import { Modal, emptyDrafts, type Mode } from './components/Modals'
import type { Chatter } from './components/Floor'
import { INITIAL_AGENTS, MOCK_CHATTER, nextStatusLine } from './lib/mockAgents'
import type { Agent, AgentState, FeedEvent, Machine, Office } from './lib/types'
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
    officeId: raw.officeId ? String(raw.officeId) : 'office-1',
    character: raw.character ? String(raw.character) : undefined,
    contextWindow: Number(raw.contextWindow ?? 200000),
    tokensUsed: Number(raw.tokensUsed ?? 12000),
    uptimeSec: Number(raw.uptimeSec ?? 3600),
    tasksDone: Number(raw.tasksDone ?? 0),
    tasksTotal: Number(raw.tasksTotal ?? 0),
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
  const [offices, setOffices] = useState<Office[]>([{ id: 'office-1', name: 'Office', machineId: 'mini', runtime: 'docker', agentIds: [] }])
  const [machines, setMachines] = useState<Machine[]>([{ id: 'mini', label: 'Mac mini' }])
  const [modal, setModal] = useState<{ mode: Mode; returnTo: Mode | null } | null>(null)
  const [drafts, setDrafts] = useState(emptyDrafts)
  const [toast, setToast] = useState('')
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2500) }

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

  const refreshAll = useCallback(async () => {
    await refreshAgents()
    try {
      const [o, m] = await Promise.all([fetch(`${HUB}/offices`), fetch(`${HUB}/machines`)])
      if (o.ok) { const d = await o.json(); if (Array.isArray(d) && d.length) setOffices(d) }
      if (m.ok) { const d = await m.json(); if (Array.isArray(d) && d.length) setMachines(d) }
    } catch { /* hub down */ }
  }, [refreshAgents])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const post = async (path: string, body: unknown) => {
    try {
      const r = await fetch(`${HUB}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      return r.ok ? await r.json() : null
    } catch { return null }
  }

  const openModal = (mode: Mode, preset?: { officeId?: string }) => {
    setDrafts((d) => ({
      ...d,
      agent: { ...d.agent, officeId: preset?.officeId || d.agent.officeId || offices[0]?.id || '' },
      office: { ...d.office, machineId: d.office.machineId || machines[0]?.id || '' },
    }))
    setModal({ mode, returnTo: null })
  }

  const submitModal = async (mode: Mode): Promise<string | null> => {
    let id: string | null = null
    if (mode === 'computer') {
      const c = drafts.computer
      const r = await post('/machines', { name: c.name, host: c.address || undefined, kind: c.kind })
      if (r) { id = r.id; setDrafts((d) => ({ ...d, computer: emptyDrafts().computer, office: { ...d.office, machineId: r.id } })); flash(`Computer ${c.name} added`) }
    } else if (mode === 'office') {
      const o = drafts.office
      const agentsIn = o.newAgents.split(',').map((x) => x.trim()).filter(Boolean).map((name) => ({ name }))
      const r = await post('/offices', { name: o.name, runtime: o.runtime, machineId: o.machineId || undefined, agents: agentsIn, moveAgentIds: o.agentIds })
      if (r) { id = r.office.id; setDrafts((d) => ({ ...d, office: emptyDrafts().office, agent: { ...d.agent, officeId: r.office.id } })); flash(`Office ${o.name} created`) }
    } else {
      const a = drafts.agent
      const r = await post('/agents', { name: a.name, model: a.model || undefined, contextWindow: a.contextWindow, character: a.character, officeId: a.officeId || undefined })
      if (r) { id = r.agent.id; setDrafts((d) => ({ ...d, agent: { ...emptyDrafts().agent, officeId: a.officeId } })); flash(`${a.name} hired`) }
    }
    if (!id) return null
    await refreshAll()
    setModal((m) => (m?.returnTo ? { mode: m.returnTo, returnTo: null } : null))
    return id
  }

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
        if (msg.type === 'office.created' || msg.type === 'machine.created' || msg.type === 'agent.created') void refreshAll()
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
        <button className={styles.add} onClick={() => openModal('office')}>+ Office</button>
        <button className={styles.add} onClick={() => openModal('agent')}>+ Agent</button>
        <button className={styles.add} onClick={() => openModal('computer')}>+ Computer</button>
      </header>
      <div className={styles.main}>
        <Floor agents={agents} offices={offices} machines={machines} chatter={chatter} selectedId={selectedId} onSelect={select} onNewOffice={() => openModal('office')} onAddAgent={(officeId) => openModal('agent', { officeId })} />
        <SidePanel
          agent={selected}
          feed={feed.filter((e) => !selected || e.agentId === selected.id || e.agentId === 'all')}
          onClose={() => setSelectedId(null)}
          onMessage={() => composerRef.current?.focus()}
        />
      </div>
      {modal && (
        <Modal mode={modal.mode} returnTo={modal.returnTo} drafts={drafts} setDrafts={setDrafts} offices={offices} machines={machines}
          agents={agents.map((a) => ({ id: a.id, name: a.name }))}
          onSwitch={(to, returnTo) => setModal({ mode: to, returnTo })} onClose={() => setModal(null)} onSubmit={submitModal} />
      )}
      {toast && <div className={styles.toast}>{toast}</div>}
      <Composer ref={composerRef} agents={agents} target={target} onTarget={setTarget} onSend={sendMessage} />
    </div>
  )
}
