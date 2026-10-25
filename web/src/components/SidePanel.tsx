import type { Agent, FeedEvent } from '../lib/types'
import { Sprite } from './Sprite'
import s from './SidePanel.module.css'

type Props = { agent: Agent | null; feed: FeedEvent[]; onClose: () => void; onMessage: () => void }

export function SidePanel({ agent, feed, onClose, onMessage }: Props) {
  if (!agent) return <aside className={s.panel}><p className={s.hint}>Click a desk to see its agent.</p></aside>
  const latest = feed[0]
  return (
    <aside className={s.panel} aria-label={`${agent.name} panel`}>
      <div className={s.card}>
        <div className={s.head}>
          <div className={s.avatar}><Sprite name={agent.name} size={56} /></div>
          <div style={{ flex: 1 }}>
            <div className={s.name}>{agent.name}</div>
            <div className={s.sub}>{agent.room ?? 'office'} · {agent.machineId}</div>
            <div className={s.tags}><span>{agent.provider}</span>{agent.model && <span>{agent.model}</span>}</div>
          </div>
          <button className={s.x} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={s.status} data-state={agent.state}><b>{agent.state}</b> · {agent.statusLine || '—'}</div>
        <div className={s.preview} data-state={agent.state}>
          <div className={s.bar}><i /><i /><i /> <span>{agent.name.toLowerCase()} · preview</span></div>
          <div className={s.screen}><i /><i /><i /><i /></div>
          <div className={s.caption}>{latest ? latest.text : 'live preview (stub)'}</div>
        </div>
        <div className={s.row}>
          <button className={s.btn}>Pause</button>
          <button className={`${s.btn} ${s.primary}`} onClick={onMessage}>Message</button>
        </div>
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
    </aside>
  )
}
