"""Native machine daemon — reports CPU/RAM/disk to hub every 2s. Slice-0 stub."""
import json, os, time, urllib.request
try:
    import psutil
except ImportError:
    psutil = None
HUB = os.environ.get("HUB_URL", "http://127.0.0.1:8787")
MID = os.environ.get("MACHINE_ID", "mini")

def stats():
    if not psutil:
        return {"id": MID, "host": os.uname().nodename, "cpu": 0.0, "ram": 0.0, "disk": 0.0, "gpu": None, "agentIds": []}
    disk = psutil.disk_usage("/").percent
    return {"id": MID, "host": os.uname().nodename, "cpu": psutil.cpu_percent(interval=None),
            "ram": psutil.virtual_memory().percent, "disk": disk, "gpu": None, "agentIds": []}

# Slice-0: print only; POST /machines update not in hub yet
while True:
    s = stats()
    print(json.dumps(s), flush=True)
    time.sleep(2)
