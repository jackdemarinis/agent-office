import type { Agent } from './types'

export const INITIAL_AGENTS: Agent[] = [
  { id: 'a1', name: 'Nova', provider: 'mock', model: 'mock-v0', state: 'working', statusLine: 'Shaping slice DoD…', machineId: 'mini', room: 'office' },
  { id: 'a2', name: 'Iris', provider: 'mock', model: 'mock-v0', state: 'waiting', statusLine: 'Waiting on you', machineId: 'mini', room: 'office' },
  { id: 'a3', name: 'Kai', provider: 'mock', model: 'mock-v0', state: 'working', statusLine: 'Stubbing hub /health', machineId: 'mini', room: 'office' },
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
