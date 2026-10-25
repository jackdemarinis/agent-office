import type { Agent } from '../lib/types'
import { Desk } from './Desk'
import styles from './Floor.module.css'

type Props = {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function Floor({ agents, selectedId, onSelect }: Props) {
  return (
    <section className={styles.floor} aria-label="Office floor">
      <div className={styles.grid}>
        {agents.map((agent) => (
          <Desk
            key={agent.id}
            agent={agent}
            selected={agent.id === selectedId}
            onClick={() => onSelect(agent.id)}
          />
        ))}
      </div>
    </section>
  )
}
