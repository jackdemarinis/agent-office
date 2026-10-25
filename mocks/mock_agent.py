"""Mock agent: posts status events, polls inbox, acks messages. stdlib only."""
import json, os, random, time, urllib.request
HUB = os.environ.get("HUB_URL", "http://localhost:8787"); AID = os.environ.get("AGENT_ID", "mock-agent-1")
def post(p, d):
    r = urllib.request.Request(HUB + p, json.dumps(d).encode(), {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(r, timeout=5))
def get(p): return json.load(urllib.request.urlopen(HUB + p, timeout=5))
since = 0
while True:
    try:
        st = random.choice(["working", "thinking", "idle"])
        post("/events", {"agentId": AID, "state": st, "statusLine": f"{st} on fake task #{random.randint(1,99)}"})
        r = get(f"/agents/{AID}/inbox?since={since}"); since = r["next"]
        for m in r["messages"]:
            post("/events", {"agentId": AID, "type": "ack", "text": f"ack: {m['text']}"})
    except Exception as e: print("hub unreachable:", e, flush=True)
    time.sleep(float(os.environ.get("INTERVAL", "3")))
