import { useEffect, useRef, useState } from 'react'
import type { Machine, Office, Runtime } from '../lib/types'
import s from './Modals.module.css'

export type Mode = 'agent' | 'office' | 'computer'
export type AgentDraft = { name: string; character: string; model: string; contextWindow: number; officeId: string }
export type OfficeDraft = { name: string; machineId: string; runtime: Runtime; agentIds: string[]; newAgents: string }
export type ComputerDraft = { name: string; address: string; kind: string }

export const emptyDrafts = () => ({
  agent: { name: '', character: 'fox', model: '', contextWindow: 200000, officeId: '' } as AgentDraft,
  office: { name: '', machineId: '', runtime: 'docker' as Runtime, agentIds: [], newAgents: '' } as OfficeDraft,
  computer: { name: '', address: '', kind: 'this-mac' } as ComputerDraft,
})
type Drafts = ReturnType<typeof emptyDrafts>

type Props = {
  mode: Mode; drafts: Drafts; setDrafts: (d: Drafts) => void; offices: Office[]; machines: Machine[]
  agents: { id: string; name: string }[]
  /** stack of modes to return to after create (cross-link) */
  returnTo: Mode | null
  onSwitch: (to: Mode, returnTo: Mode | null) => void
  onClose: () => void
  onSubmit: (mode: Mode) => Promise<string | null> // returns created id or null on error
}

const CTX = [32000, 128000, 200000, 1000000]
const KINDS = [['this-mac', 'This Mac'], ['lan', 'LAN'], ['tailscale', 'Tailscale'], ['cloud-vm', 'Cloud VM']]
const RTS: [Runtime, string, string][] = [['docker', 'Docker', 'container on that computer'], ['raw', 'Raw resource', 'native host process'], ['cloud', 'Cloud', 'remote stub — coming soon']]

export function Modal({ mode, drafts, setDrafts, offices, machines, agents, returnTo, onSwitch, onClose, onSubmit }: Props) {
  const first = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { first.current?.focus(); setErr('') }, [mode])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const a = drafts.agent, o = drafts.office, c = drafts.computer
  const setA = (p: Partial<AgentDraft>) => setDrafts({ ...drafts, agent: { ...a, ...p } })
  const setO = (p: Partial<OfficeDraft>) => setDrafts({ ...drafts, office: { ...o, ...p } })
  const setC = (p: Partial<ComputerDraft>) => setDrafts({ ...drafts, computer: { ...c, ...p } })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return
    setBusy(true); const id = await onSubmit(mode); setBusy(false)
    if (!id) setErr('Hub rejected or unreachable — check hub is running.')
  }
  const title = { agent: '+ Agent', office: '+ Office', computer: '+ Computer' }[mode]
  const cta = { agent: 'Add agent', office: 'Create office', computer: 'Add computer' }[mode]

  return (
    <div className={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={s.card} onSubmit={submit} role="dialog" aria-label={title}>
        <h2>{title}{returnTo && <span className={s.back}> · then back to {returnTo}</span>}</h2>

        {mode === 'agent' && <>
          <label>Name<input ref={first} required value={a.name} onChange={(e) => setA({ name: e.target.value })} placeholder="e.g. rex" /></label>
          <div className={s.lbl}>Character</div>
          <div className={s.seg}>{['fox', 'cat', 'robot', 'blob'].map((k) => (
            <button type="button" key={k} data-on={a.character === k} onClick={() => setA({ character: k })}>{k}</button>))}</div>
          <div className={s.row}>
            <label>Model<input value={a.model} onChange={(e) => setA({ model: e.target.value })} placeholder="mock-1" /></label>
            <label>Context window<select value={a.contextWindow} onChange={(e) => setA({ contextWindow: +e.target.value })}>
              {CTX.map((n) => <option key={n} value={n}>{n >= 1e6 ? '1M' : `${n / 1000}k`}</option>)}</select></label>
          </div>
          <label>Office<select value={a.officeId} onChange={(e) => e.target.value === '__new' ? onSwitch('office', 'agent') : setA({ officeId: e.target.value })}>
            {offices.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.machineId} · {x.runtime}</option>)}
            <option value="__new">Create new office…</option></select></label>
        </>}

        {mode === 'office' && <>
          <label>Name<input ref={first} required value={o.name} onChange={(e) => setO({ name: e.target.value })} placeholder="e.g. Lab" /></label>
          <label>Computer<select value={o.machineId} onChange={(e) => e.target.value === '__new' ? onSwitch('computer', 'office') : setO({ machineId: e.target.value })}>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.label ?? m.id}{m.host ? ` · ${m.host}` : ''}</option>)}
            <option value="__new">Add computer…</option></select></label>
          <div className={s.lbl}>Location *</div>
          <div className={s.radios}>{RTS.map(([v, l, d]) => (
            <label key={v} className={s.radio} data-on={o.runtime === v}>
              <input type="radio" name="rt" checked={o.runtime === v} onChange={() => setO({ runtime: v })} /> <b>{l}</b> <small>{d}</small>
            </label>))}</div>
          {agents.length > 0 && <>
            <div className={s.lbl}>Move existing agents in (optional)</div>
            <div className={s.seg}>{agents.map((x) => {
              const on = o.agentIds.includes(x.id)
              return <button type="button" key={x.id} data-on={on} onClick={() => setO({ agentIds: on ? o.agentIds.filter((i) => i !== x.id) : [...o.agentIds, x.id] })}>{x.name}</button>
            })}</div>
          </>}
          <label>Spawn new agents (optional, comma-separated)<input value={o.newAgents} onChange={(e) => setO({ newAgents: e.target.value })} placeholder="rex, juno" /></label>
        </>}

        {mode === 'computer' && <>
          <label>Name<input ref={first} required value={c.name} onChange={(e) => setC({ name: e.target.value })} placeholder="e.g. desktop-rig" /></label>
          <label>Address (host / IP, optional)<input value={c.address} onChange={(e) => setC({ address: e.target.value })} placeholder="rig.local or 100.x.y.z" /></label>
          <div className={s.lbl}>Kind</div>
          <div className={s.seg}>{KINDS.map(([v, l]) => (
            <button type="button" key={v} data-on={c.kind === v} onClick={() => setC({ kind: v })}>{l}</button>))}</div>
          <p className={s.note}>Slice 0: registers the computer only — no SSH/provisioning yet.</p>
        </>}

        {err && <p className={s.err}>{err}</p>}
        <div className={s.foot}>
          {mode === 'office' && !returnTo && <button type="button" className={s.link} onClick={() => onSwitch('agent', null)}>Add agent into an office →</button>}
          {mode === 'computer' && !returnTo && <button type="button" className={s.link} onClick={() => onSwitch('office', null)}>Place an office →</button>}
          <span style={{ flex: 1 }} />
          <button type="button" className={s.ghost} onClick={onClose}>Cancel</button>
          <button className={s.primary} disabled={busy}>{busy ? '…' : cta}</button>
        </div>
      </form>
    </div>
  )
}
