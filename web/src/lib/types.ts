export type AgentState = 'idle' | 'working' | 'waiting' | 'error'

export type Agent = {
  id: string
  name: string
  provider: string
  model: string
  state: AgentState
  statusLine: string
  machineId: string
  room?: string
  officeId?: string
  character?: string
  contextWindow: number
  tokensUsed: number
  uptimeSec: number
  tasksDone: number
  tasksTotal: number
}

export type Runtime = 'docker' | 'raw' | 'cloud'
export type Office = { id: string; name: string; machineId: string; runtime: Runtime; agentIds: string[] }
export type Machine = { id: string; label?: string; host?: string; kind?: string; agentIds?: string[] }

export type FeedEvent = {
  id: string
  at: number
  agentId: string
  kind: string
  text: string
}
