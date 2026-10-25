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

## Floor UI (Slice 0 — matches target mock in CSS)
Character-forward office per `product-hq/02_design/briefs/2026-10-25_floor-visual-brief.md`: one machine column (from hub `machineId`), one room with checkered floor + plant + health chip, SVG pixel sprites per agent, dashed chatter arcs, right panel (preview stub + CHATTER feed), bottom `@all`/`@name` composer → `message.send` / `POST /messages`.
Hub unreachable/empty → 3 demo agents seed after ~1s. Run: `npm install && npm run dev` → http://localhost:5173 (hub on :8787 optional).

## Creating computers, offices, agents (Slice 0)
Run the hub (`cd ../hub && uv run uvicorn main:app --port 8787`) and `npm run dev`.
- Top bar **+ Computer** → name, address, kind (This Mac / LAN / Tailscale / Cloud VM) → `POST /machines`.
- **+ Office** → name, computer (or "Add computer…"), location **Docker | Raw resource | Cloud**, optionally move existing agents in or spawn new ones (comma list) → `POST /offices`.
- **+ Agent** (top bar or "+ agent" in a room) → name, character, model, context window, office (or "Create new office…") → `POST /agents`.
- Cross-links swap the modal card and return to the original form with the new item selected. Esc/backdrop closes.
- One office = full-bleed room; 2+ = grid. Desks show model, ctx used/window, uptime, tasks.
- Chatter links are orthogonal (up / across / down) with an arrowhead into the receiver and a `from → to` label.
Hub state is in-memory; restarting it resets to the seeded office.
