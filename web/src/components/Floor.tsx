import type { Agent } from '../lib/types'
import { Sprite } from './Sprite'
import s from './Floor.module.css'

export type Chatter = { from: string; to: string; text: string }
type Props = { agents: Agent[]; chatter: Chatter[]; selectedId: string | null; onSelect: (id: string) => void }

const clip = (t: string) => (t.length > 28 ? t.slice(0, 27) + '…' : t)
const EMOTE: Record<string, string> = { waiting: '❓', error: '!', idle: 'z' }

function rollup(agents: Agent[]) {
  if (agents.some((a) => a.state === 'error')) return { label: `${agents.filter((a) => a.state === 'error').length} blocked`, tone: 'bad' }
  if (agents.every((a) => a.state === 'idle')) return { label: 'Idle', tone: 'idle' }
  return { label: 'On track', tone: 'ok' }
}

export function Floor({ agents, chatter, selectedId, onSelect }: Props) {
  const byMachine = new Map<string, Agent[]>()
  for (const a of agents) {
    const m = a.machineId || 'local'
    byMachine.set(m, [...(byMachine.get(m) ?? []), a])
  }
  return (
    <main className={s.floor}>
      {[...byMachine.entries()].map(([machine, list]) => {
        const r = rollup(list)
        const idx = (n: string) => list.findIndex((a) => a.name.toLowerCase() === n.toLowerCase())
        const arcs = chatter.filter((c) => idx(c.from) >= 0 && idx(c.to) >= 0 && c.from !== c.to)
        const cx = (i: number) => ((i + 0.5) / list.length) * 100
        return (
          <section key={machine} className={s.machine}>
            <header className={s.machineHead}>🖥 {machine.toUpperCase()}</header>
            <div className={s.room}>
              <div className={s.roomHead}>
                <span>{(list[0]?.room ?? 'office').toUpperCase()}</span>
                <span className={s.health} data-tone={r.tone}>{r.label}</span>
              </div>
              <div className={s.meta}>{list.length} agents</div>
              <div className={s.desks}>
                <svg className={s.arcs} viewBox="0 0 100 100" preserveAspectRatio="none">
                  {arcs.map((c, k) => {
                    const a = cx(idx(c.from)), b = cx(idx(c.to))
                    return <path key={k} d={`M${a} 30 Q${(a + b) / 2} ${-10 - k * 15} ${b} 30`} />
                  })}
                </svg>
                {arcs.map((c, k) => (
                  <span key={k} className={s.pill} style={{ left: `${(cx(idx(c.from)) + cx(idx(c.to))) / 2}%`, top: `${2 + k * 22}px` }}>
                    {c.from} → {c.to}: {c.text}
                  </span>
                ))}
                {list.map((a) => (
                  <button key={a.id} className={s.desk} data-state={a.state} data-selected={a.id === selectedId} onClick={() => onSelect(a.id)}>
                    {EMOTE[a.state] && <span className={s.emote}>{EMOTE[a.state]}</span>}
                    <div className={s.station}>
                      <div className={s.char}><Sprite name={a.name} /></div>
                      <div className={s.monitor}><i /><i /><i /></div>
                    </div>
                    <div className={s.name}><span className={s.dot} />{a.name}</div>
                    <div className={s.chip}>{clip(a.statusLine || a.state)}</div>
                  </button>
                ))}
              </div>
              <span className={s.plant}>🪴</span>
            </div>
          </section>
        )
      })}
      <section className={`${s.machine} ${s.ghost}`} aria-hidden>
        <div className={s.ghostTile}>+ New office</div>
      </section>
    </main>
  )
}
