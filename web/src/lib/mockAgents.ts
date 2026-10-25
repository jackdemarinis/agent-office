import type { Agent } from './types'

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'a1',
    name: 'Nova',
    provider: 'mock',
    model: 'mock-v0',
    state: 'working',
    statusLine: 'Shaping slice DoD…',
    machineId: 'mini',
  },
  {
    id: 'a2',
    name: 'Kai',
    provider: 'mock',
    model: 'mock-v0',
    state: 'idle',
    statusLine: 'Waiting for ADR kickoff',
    machineId: 'mini',
  },
  {
    id: 'a3',
    name: 'Rex',
    provider: 'mock',
    model: 'mock-v0',
    state: 'working',
    statusLine: 'Stubbing hub /health',
    machineId: 'mini',
  },
]

const LINES: Record<string, string[]> = {
  a1: [
    'Shaping slice DoD…',
    'Checking cycle board…',
    'Drafting acceptance notes…',
  ],
  a2: [
    'Waiting for ADR kickoff',
    'Sketching hub topology…',
    'Reviewing compose ports…',
  ],
  a3: [
    'Stubbing hub /health',
    'Wiring mock emitters…',
    'SQLite bootstrap…',
  ],
}

export function nextStatusLine(agentId: string, current: string): string {
  const pool = LINES[agentId] ?? [current]
  const i = pool.indexOf(current)
  return pool[(i + 1) % pool.length]
}
