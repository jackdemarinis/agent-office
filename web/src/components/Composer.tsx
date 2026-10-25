import { FormEvent, forwardRef, useState } from 'react'
import type { Agent } from '../lib/types'
import s from './Composer.module.css'

type Props = { agents: Agent[]; target: string; onTarget: (t: string) => void; onSend: (to: string, text: string) => void }

export const Composer = forwardRef<HTMLInputElement, Props>(function Composer({ agents, target, onTarget, onSend }, ref) {
  const [text, setText] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(target, text.trim())
    setText('')
  }
  return (
    <form className={s.bar} onSubmit={submit}>
      {['@all', ...agents.map((a) => `@${a.name}`)].map((t) => (
        <button type="button" key={t} className={s.pill} data-on={t === target} onClick={() => onTarget(t)}>{t}</button>
      ))}
      <input ref={ref} className={s.input} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message an agent, an office, a computer, or @all  (→ ${target})`} />
      <button className={s.send} type="submit">Send</button>
    </form>
  )
})
