import type { Agent, Machine, Office } from '../lib/types'
import { fmtK, fmtUp } from '../lib/mockAgents'
import { Sprite } from './Sprite'
import s from './Floor.module.css'

export type Chatter = { from: string; to: string; text: string }
type Props = {
  agents: Agent[]; offices: Office[]; machines: Machine[]; chatter: Chatter[]; selectedId: string | null
  onSelect: (id: string) => void; onNewOffice: () => void; onAddAgent: (officeId: string) => void
}

const clip = (t: string) => (t.length > 28 ? t.slice(0, 27) + '…' : t)
const EMOTE: Record<string, string> = { waiting: '❓', error: '!', idle: 'z' }
const RT: Record<string, string> = { docker: '🐳 docker', raw: '⚙ raw', cloud: '☁ cloud' }

function rollup(agents: Agent[]) {
  if (!agents.length) return { label: 'Empty', tone: 'idle' }
  if (agents.some((a) => a.state === 'error')) return { label: `${agents.filter((a) => a.state === 'error').length} blocked`, tone: 'bad' }
  if (agents.every((a) => a.state === 'idle')) return { label: 'Idle', tone: 'idle' }
  return { label: 'On track', tone: 'ok' }
}

export function Floor({ agents, offices, machines, chatter, selectedId, onSelect, onNewOffice, onAddAgent }: Props) {
  const rooms = offices.map((o) => ({ o, list: agents.filter((a) => (a.officeId ?? 'office-1') === o.id) }))
  const solo = rooms.length === 1
  return (
    <main className={s.floor} data-solo={solo}>
      {rooms.map(({ o, list }) => {
        const r = rollup(list)
        const m = machines.find((x) => x.id === o.machineId)
        const idx = (n: string) => list.findIndex((a) => a.name.toLowerCase() === n.toLowerCase())
        const arcs = chatter.filter((c) => idx(c.from) >= 0 && idx(c.to) >= 0 && c.from !== c.to).slice(0, 4)
        const cx = (i: number) => ((i + 0.5) / list.length) * 100
        return (
          <section key={o.id} className={s.machine}>
            <header className={s.machineHead}>🖥 {(m?.label ?? o.machineId).toUpperCase()} <span className={s.rt}>{RT[o.runtime] ?? o.runtime}</span></header>
            <div className={s.room}>
              <div className={s.roomHead}>
                <span>{o.name.toUpperCase()}</span>
                <span className={s.health} data-tone={r.tone}>{r.label}</span>
              </div>
              <div className={s.meta}>{list.length} agents <button className={s.addAgent} onClick={() => onAddAgent(o.id)}>+ agent</button></div>
              <div className={s.desks}>
                {/* Orthogonal chatter: up from sender, across a lane, down into receiver with arrowhead */}
                {arcs.map((c, k) => {
                  const a = cx(idx(c.from)), b = cx(idx(c.to))
                  const lane = 14 + k * 14, off = (k - (arcs.length - 1) / 2) * 1.2
                  const x1 = a + off, x2 = b + off
                  return (
                    <div key={k} className={s.link}>
                      <span className={`${s.seg} ${s.v}`} style={{ left: `${x1}%`, top: lane, height: 66 - lane }} />
                      <span className={`${s.seg} ${s.h}`} style={{ left: `${Math.min(x1, x2)}%`, top: lane, width: `${Math.abs(x2 - x1)}%` }} />
                      <span className={`${s.seg} ${s.v}`} style={{ left: `${x2}%`, top: lane, height: 66 - lane - 6 }} />
                      <span className={s.head} style={{ left: `${x2}%`, top: 60 }}>▼</span>
                      <span className={s.pill} style={{ left: `${(x1 + x2) / 2}%`, top: lane - 9 }}>{c.from} → {c.to}: {c.text}</span>
                    </div>
                  )
                })}
                {list.map((a) => (
                  <button key={a.id} className={s.desk} data-state={a.state} data-selected={a.id === selectedId} onClick={() => onSelect(a.id)}>
                    {EMOTE[a.state] && <span className={s.emote}>{EMOTE[a.state]}</span>}
                    <div className={s.station}>
                      <div className={s.char}><Sprite name={a.name} kind={a.character} /></div>
                      <div className={s.monitor}><i /><i /><i /></div>
                    </div>
                    <div className={s.name}><span className={s.dot} />{a.name}</div>
                    <div className={s.chip}>{clip(a.statusLine || a.state)}</div>
                    <div className={s.stats}>
                      <span title="model">◆ {a.model || '—'}</span>
                      <span title="context used / window">ctx {fmtK(a.tokensUsed)}/{fmtK(a.contextWindow)}</span>
                      <span title="uptime">⏱ {fmtUp(a.uptimeSec)}</span>
                      <span title="tasks">✓ {a.tasksDone}/{a.tasksTotal}</span>
                    </div>
                  </button>
                ))}
              </div>
              <span className={s.plant}>🪴</span>
            </div>
          </section>
        )
      })}
      {!solo && (
        <section className={`${s.machine} ${s.ghost}`}>
          <button className={s.ghostTile} onClick={onNewOffice}>+ New office</button>
        </section>
      )}
    </main>
  )
}
