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
}

export type FeedEvent = {
  id: string
  at: number
  agentId: string
  kind: string
  text: string
}
