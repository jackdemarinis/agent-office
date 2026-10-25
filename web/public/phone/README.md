# Agent Office — Phone (Slice 0)

Thin responsive web shell for the phone light client. Same hub WebSocket contract as web later; this build uses **3 hardcoded mock agents** and a command input stub.

## Open

From this folder:

```bash
# any static server; Python is enough
python3 -m http.server 8788
```

Then on the phone (or browser): `http://<host>:8788/`  
On the Mac mini LAN / Tailscale, point at the mini host once the hub is up; for now static mocks need no hub.

Or open `index.html` directly in a browser (file:// works for this stub).

## Next (not this slice)

- Connect to hub `GET /agents` and `/ws` (`agent.updated`, `message.send`)
- Tailscale remote access to mini `:8787` hub; this page can stay static or be served by hub
