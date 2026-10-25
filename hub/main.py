from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

app = FastAPI(title="Agent Office Hub")
AGENTS = {f"mock-agent-{i}": {"id": f"mock-agent-{i}", "name": n, "provider": "mock", "model": "mock-1",
          "state": "idle", "statusLine": "waiting", "machineId": "mini",
          "officeId": "office-1", "contextWindow": 200000, "tokensUsed": 12000 * i, "uptimeSec": 3600 * i,
          "tasksDone": i, "tasksTotal": 4} for i, n in [(1, "nova"), (2, "iris"), (3, "kai")]}
MACHINES = {"mini": {"id": "mini", "host": "mac-mini.local", "cpu": 0.0, "ram": 0.0, "disk": 0.0, "gpu": None,
            "agentIds": list(AGENTS), "label": "Mac mini"}}
OFFICES = {"office-1": {"id": "office-1", "name": "Office", "machineId": "mini", "runtime": "docker",
           "agentIds": list(AGENTS)}}
GOAL = {"markdown": "# Slice 0\nDemo loop with 3 mock agents.", "tasks": []}
EVENTS: list[dict] = []
CLIENTS: set[WebSocket] = set()

class Message(BaseModel):
    to: str
    text: str

class Goal(BaseModel):
    markdown: str
    tasks: list = []

class Event(BaseModel):
    agentId: str
    type: str = "status"
    state: str | None = None
    statusLine: str | None = None
    text: str | None = None

class AgentIn(BaseModel):
    name: str
    provider: str | None = None
    model: str | None = None
    contextWindow: int | None = None
    character: str | None = None

class OfficeIn(BaseModel):
    name: str
    runtime: str = "docker"
    machineId: str | None = None
    agents: list[AgentIn] = []
    moveAgentIds: list[str] = []

class NewAgent(AgentIn):
    officeId: str | None = None
    newOffice: OfficeIn | None = None

class MachineIn(BaseModel):
    name: str
    host: str | None = None
    ip: str | None = None
    kind: str = "lan"

def _id(prefix, store):
    n = len(store) + 1
    while f"{prefix}-{n}" in store: n += 1
    return f"{prefix}-{n}"

async def broadcast(msg: dict):
    for ws in list(CLIENTS):
        try: await ws.send_json(msg)
        except Exception: CLIENTS.discard(ws)

def targets(to: str):
    if to == "@all" or to.startswith("#"): return list(AGENTS)
    n = to.lstrip("@")
    return [a["id"] for a in AGENTS.values() if n in (a["name"], a["id"])]

@app.get("/health")
def health(): return {"ok": True, "agents": len(AGENTS), "clients": len(CLIENTS)}

@app.get("/agents")
def agents(): return list(AGENTS.values())

@app.get("/machines")
def machines(): return list(MACHINES.values())

@app.post("/machines")
async def create_machine(m: MachineIn):
    mid = _id("machine", MACHINES)
    mc = {"id": mid, "label": m.name, "host": m.host or m.ip or m.name, "ip": m.ip, "kind": m.kind, "cpu": 0.0, "ram": 0.0,
          "disk": 0.0, "gpu": None, "agentIds": []}
    MACHINES[mid] = mc; await broadcast({"type": "machine.created", "machine": mc}); return mc

@app.get("/offices")
def offices(): return list(OFFICES.values())

async def _add_agent(a: AgentIn, office: dict) -> dict:
    aid = _id("agent", AGENTS)
    rec = {"id": aid, "name": a.name, "provider": a.provider or "mock", "model": a.model or "mock-1",
           "state": "idle", "statusLine": "just hired", "machineId": office["machineId"], "officeId": office["id"],
           "contextWindow": a.contextWindow or 200000, "character": a.character, "tokensUsed": 0, "uptimeSec": 0, "tasksDone": 0, "tasksTotal": 0}
    AGENTS[aid] = rec; office["agentIds"].append(aid)
    MACHINES.setdefault(office["machineId"], {"id": office["machineId"], "host": office["machineId"], "agentIds": []})["agentIds"].append(aid)
    await broadcast({"type": "agent.created", "agent": rec}); return rec

async def _create_office(o: OfficeIn) -> dict:
    if o.runtime not in ("docker", "raw", "cloud"): raise HTTPException(400, "runtime must be docker|raw|cloud")
    mid = o.machineId or ("cloud" if o.runtime == "cloud" else "mini")
    if mid not in MACHINES:
        MACHINES[mid] = {"id": mid, "label": mid, "host": mid, "cpu": 0.0, "ram": 0.0, "disk": 0.0, "gpu": None, "agentIds": []}
        await broadcast({"type": "machine.created", "machine": MACHINES[mid]})
    off = {"id": _id("office", OFFICES), "name": o.name, "machineId": mid, "runtime": o.runtime, "agentIds": []}
    OFFICES[off["id"]] = off
    for aid in o.moveAgentIds:
        a = AGENTS.get(aid)
        if not a: continue
        for ox in OFFICES.values():
            if aid in ox["agentIds"]: ox["agentIds"].remove(aid)
        a["officeId"] = off["id"]; a["machineId"] = mid; off["agentIds"].append(aid)
        await broadcast({"type": "agent.updated", "agent": a})
    for a in o.agents: await _add_agent(a, off)
    await broadcast({"type": "office.created", "office": off}); return off

@app.post("/offices")
async def create_office(o: OfficeIn):
    off = await _create_office(o)
    return {"office": off, "agents": [AGENTS[i] for i in off["agentIds"]]}

@app.post("/agents")
async def create_agent(a: NewAgent):
    if a.newOffice: off = await _create_office(a.newOffice)
    else:
        off = OFFICES.get(a.officeId or "office-1")
        if not off: raise HTTPException(404, "office not found")
    rec = await _add_agent(a, off)
    return {"agent": rec, "office": off}

@app.delete("/agents/{aid}")
async def delete_agent(aid: str):
    if aid not in AGENTS: raise HTTPException(404, "agent not found")
    del AGENTS[aid]
    for off in OFFICES.values():
        if aid in off["agentIds"]: off["agentIds"].remove(aid)
    for mc in MACHINES.values():
        if aid in mc.get("agentIds", []): mc["agentIds"].remove(aid)
    await broadcast({"type": "agent.removed", "id": aid})
    return {"ok": True, "id": aid}

@app.get("/goal")
def get_goal(): return GOAL

@app.put("/goal")
async def put_goal(g: Goal):
    GOAL.update(g.model_dump()); await broadcast({"type": "goal.updated", "goal": GOAL}); return GOAL

@app.post("/messages")
async def messages(m: Message):
    ids = targets(m.to)
    for i in ids:
        e = {"agentId": i, "type": "message", "text": m.text}
        EVENTS.append(e); await broadcast({"type": "event.appended", "event": e})
        # Slice-0: immediate mock ack so UI works even if adapter poll lags
        ack = {"agentId": i, "type": "ack", "text": f"ack: {m.text}", "kind": "message.ack"}
        EVENTS.append(ack); await broadcast({"type": "event.appended", "event": ack})
        a = AGENTS.get(i)
        if a:
            a["state"] = "working"; a["statusLine"] = f"Handling: {m.text[:40]}"
            await broadcast({"type": "agent.updated", "agent": a})
    return {"delivered": ids}

@app.get("/agents/{aid}/inbox")
def inbox(aid: str, since: int = 0):
    return {"next": len(EVENTS), "messages": [e for e in EVENTS[since:] if e["agentId"] == aid and e["type"] == "message"]}

@app.post("/events")
async def events(e: Event):
    d = e.model_dump(exclude_none=True); EVENTS.append(d)
    a = AGENTS.get(e.agentId)
    if a:
        for k in ("state", "statusLine"):
            if k in d: a[k] = d[k]
        await broadcast({"type": "agent.updated", "agent": a})
    await broadcast({"type": "event.appended", "event": d})
    return {"ok": True}

@app.websocket("/ws")
async def ws(sock: WebSocket):
    await sock.accept(); CLIENTS.add(sock)
    try:
        while True:
            msg = await sock.receive_json()
            if msg.get("type") == "message.send":
                await messages(Message(to=msg["to"], text=msg["text"]))
    except WebSocketDisconnect:
        CLIENTS.discard(sock)
