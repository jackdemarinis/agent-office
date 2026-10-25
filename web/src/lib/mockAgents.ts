import type { Agent } from './types'

export const INITIAL_AGENTS: Agent[] = [
  { id: 'a1', name: 'Nova', provider: 'mock', model: 'mock-v0', state: 'working', statusLine: 'Shaping slice DoD…', machineId: 'mini', room: 'office', officeId: 'office-1', contextWindow: 200000, tokensUsed: 12000, uptimeSec: 3600, tasksDone: 1, tasksTotal: 4 },
  { id: 'a2', name: 'Iris', provider: 'mock', model: 'mock-v0', state: 'waiting', statusLine: 'Waiting on you', machineId: 'mini', room: 'office', officeId: 'office-1', contextWindow: 200000, tokensUsed: 12000, uptimeSec: 3600, tasksDone: 1, tasksTotal: 4 },
  { id: 'a3', name: 'Kai', provider: 'mock', model: 'mock-v0', state: 'working', statusLine: 'Stubbing hub /health', machineId: 'mini', room: 'office', officeId: 'office-1', contextWindow: 200000, tokensUsed: 12000, uptimeSec: 3600, tasksDone: 1, tasksTotal: 4 },
]

export const MOCK_CHATTER = [
  { from: 'Nova', to: 'Kai', text: 'hub /health ready?' },
  { from: 'Iris', to: 'Nova', text: 'brief landed' },
]

const LINES: Record<string, string[]> = {
  a1: ['Shaping slice DoD…', 'Checking cycle board…', 'Drafting acceptance…'],
  a2: ['Waiting on you', 'Sketching desk sprites…', 'Exporting tokens…'],
  a3: ['Stubbing hub /health', 'Wiring mock emitters…', 'SQLite bootstrap…'],
}

export function nextStatusLine(agentId: string, current: string): string {
  const pool = LINES[agentId] ?? [current]
  return pool[(pool.indexOf(current) + 1) % pool.length]
}

export function fmtK(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}
export function fmtUp(sec: number): string {
  if (sec >= 3600) return `${Math.floor(sec / 3600)}h${Math.floor((sec % 3600) / 60)}m`
  return `${Math.floor(sec / 60)}m`
}
