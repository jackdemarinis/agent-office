import { FormEvent, useState } from 'react'
import type { Agent, FeedEvent } from '../lib/types'
import styles from './SidePanel.module.css'

type Props = {
  agent: Agent | null
  feed: FeedEvent[]
  onClose: () => void
  onSend: (text: string) => void
}

export function SidePanel({ agent, feed, onClose, onSend }: Props) {
  const [text, setText] = useState('')

  if (!agent) {
    return (
      <aside className={styles.panel} data-empty>
        <p className={styles.hint}>Select a desk to open the feed.</p>
      </aside>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSend(text)
    setText('')
  }

  return (
    <aside className={styles.panel} aria-label={`${agent.name} panel`}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>@{agent.name}</div>
          <div className={styles.sub}>
            {agent.state} · {agent.statusLine}
          </div>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>
          Close
        </button>
      </div>
      <ul className={styles.feed}>
        {feed.length === 0 && (
          <li className={styles.empty}>No events yet — send a message.</li>
        )}
        {feed.map((ev) => (
          <li key={ev.id}>
            <time dateTime={new Date(ev.at).toISOString()}>
              {new Date(ev.at).toLocaleTimeString()}
            </time>
            <span>{ev.text}</span>
          </li>
        ))}
      </ul>
      <form className={styles.composer} onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message @${agent.name}…`}
          aria-label="Message"
        />
        <button type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </aside>
  )
}
