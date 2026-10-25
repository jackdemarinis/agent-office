# Daemon (native on Mac mini + MacBook)

```bash
pip install psutil
MACHINE_ID=mini HUB_URL=http://<mini-lan-ip>:8787 python3 daemon.py
```

Slice 0 prints stats; hub machine ingest lands in a later slice.
