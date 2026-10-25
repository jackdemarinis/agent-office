import type { Agent } from '../lib/types'
import styles from './Desk.module.css'

type Props = {
  agent: Agent
  selected: boolean
  onClick: () => void
}

export function Desk({ agent, selected, onClick }: Props) {
  return (
    <button
      type="button"
      className={styles.desk}
      data-selected={selected || undefined}
      data-state={agent.state}
      onClick={onClick}
    >
      <div className={styles.top}>
        <span className={styles.avatar} aria-hidden>
          {agent.name.slice(0, 1)}
        </span>
        <div>
          <div className={styles.name}>{agent.name}</div>
          <div className={styles.meta}>
            {agent.provider} · {agent.model}
          </div>
        </div>
        <span className={styles.dot} data-state={agent.state} />
      </div>
      <p className={styles.status}>{agent.statusLine}</p>
    </button>
  )
}
