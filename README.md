# Agent Office (Slice 0)

Browser floor to watch mock AI coding agents at desks.

## Quick start (Mac, no Docker)

```bash
cd AgentOffice

# Hub
cd hub && python3 -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn main:app --host 0.0.0.0 --port 8787 &
cd ..

# Three mock agents
HUB_URL=http://127.0.0.1:8787 AGENT_ID=mock-agent-1 python3 mocks/mock_agent.py &
HUB_URL=http://127.0.0.1:8787 AGENT_ID=mock-agent-2 python3 mocks/mock_agent.py &
HUB_URL=http://127.0.0.1:8787 AGENT_ID=mock-agent-3 python3 mocks/mock_agent.py &

# Web floor (+ phone at /phone/index.html)
cd web && npm install && npm run dev -- --host 0.0.0.0 --port 5173
```

Open http://127.0.0.1:5173 — phone shell at http://127.0.0.1:5173/phone/index.html

## Docker (optional)

See `compose/docker-compose.yml`. Prefer bridge networking on Docker Desktop; host networking was a Linux-box workaround.
