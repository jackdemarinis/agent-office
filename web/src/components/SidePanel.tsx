import { useEffect, useState } from 'react'
import type { Agent, FeedEvent } from '../lib/types'
import { Sprite } from './Sprite'
import { fmtK, fmtUp } from '../lib/mockAgents'
import s from './SidePanel.module.css'
import m from './Modals.module.css'

type Props = {
  agent: Agent | null
  feed: FeedEvent[]
  onClose: () => void
  onMessage: () => void
  onRemove: (agent: Agent) => Promise<boolean>
}

export function SidePanel({ agent, feed, onClose, onMessage, onRemove }: Props) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setConfirm(false)
    setErr('')
    setBusy(false)
  }, [agent?.id])

  useEffect(() => {
    if (!confirm) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setConfirm(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [confirm])

  if (!agent) return <aside className={s.panel}><p className={s.hint}>Click a desk to see its agent.</p></aside>
  const latest = feed[0]

  const doRemove = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    const ok = await onRemove(agent)
    setBusy(false)
    if (!ok) {
      setErr('Could not remove — hub error or unreachable.')
      return
    }
    setConfirm(false)
  }

  return (
    <aside className={s.panel} aria-label={`${agent.name} panel`}>
      <div className={s.card}>
        <div className={s.head}>
          <div className={s.avatar}><Sprite name={agent.name} size={56} kind={agent.character} /></div>
          <div style={{ flex: 1 }}>
            <div className={s.name}>{agent.name}</div>
            <div className={s.sub}>{agent.room ?? 'office'} · {agent.machineId}</div>
            <div className={s.tags}><span>{agent.provider}</span>{agent.model && <span>{agent.model}</span>}</div>
          </div>
          <button className={s.x} onClick={onClose} aria-label="Close">×</button>
        </div>
        <dl className={s.stats}>
          <dt>model</dt><dd>{agent.model || '—'}</dd>
          <dt>provider</dt><dd>{agent.provider}</dd>
          <dt>ctx</dt><dd>{fmtK(agent.tokensUsed)}/{fmtK(agent.contextWindow)}</dd>
          <dt>uptime</dt><dd>{fmtUp(agent.uptimeSec)}</dd>
          <dt>tasks</dt><dd>{agent.tasksDone}/{agent.tasksTotal}</dd>
        </dl>
        <div className={s.status} data-state={agent.state}><b>{agent.state}</b> · {agent.statusLine || '—'}</div>
        <div className={s.preview} data-state={agent.state}>
          <div className={s.bar}><i /><i /><i /> <span>{agent.name.toLowerCase()} · preview</span></div>
          <div className={s.screen}><i /><i /><i /><i /></div>
          <div className={s.caption}>{latest ? latest.text : 'live preview (stub)'}</div>
        </div>
        <div className={s.row}>
          <button type="button" className={s.btn}>Pause</button>
          <button type="button" className={`${s.btn} ${s.primary}`} onClick={onMessage}>Message</button>
        </div>
        <button type="button" className={s.danger} onClick={() => setConfirm(true)}>Remove agent</button>
      </div>
      <div className={s.card}>
        <div className={s.title}>CHATTER</div>
        {feed.length === 0 ? <p className={s.hint}>No chatter yet</p> : (
          <ul className={s.feed}>
            {feed.map((e) => (
              <li key={e.id}><time>{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time> {e.text}</li>
            ))}
          </ul>
        )}
      </div>

      {confirm && (
        <div className={m.overlay} onMouseDown={(e) => e.target === e.currentTarget && setConfirm(false)}>
          <div className={m.card} role="dialog" aria-label={`Remove ${agent.name}?`}>
            <h2>Remove {agent.name}?</h2>
            <p className={m.note}>Work and history for this desk will stop. This can’t be undone from the floor.</p>
            {err && <p className={m.err}>{err}</p>}
            <div className={m.foot}>
              <button type="button" className={m.ghost} onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
              <button type="button" className={`${m.primary} ${s.dangerCta}`} onClick={() => void doRemove()} disabled={busy}>
                {busy ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
