# Compose

**This box (Grok Bot VM):** uses `network_mode: host` because Docker bridge blocks container→container TCP here.

**Mac mini (target):** prefer bridge network + `HUB_URL=http://hub:8787` and `ports: ["8787:8787"]` on hub.

```bash
cd /workspace/AgentOffice/compose
sudo docker compose up --build -d
curl http://127.0.0.1:8787/health
```
