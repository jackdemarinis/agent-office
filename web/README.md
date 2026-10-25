# Agent Office — web (slice 0)

Minimal Vite + React + TypeScript floor UI.

## Run

```bash
cd /workspace/AgentOffice/web
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## What you get

- 3 mock desks with rotating status lines (works offline)
- Click a desk → side panel with event feed + message box
- Stub WebSocket client to `ws://localhost:8787/ws` (retries; mock ack works without hub)
- Optional: set `VITE_HUB_WS` to point at another hub URL

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `npm run dev`  | Dev server           |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |
