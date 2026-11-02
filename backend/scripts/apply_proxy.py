"""Apply the owner-approved additive route; preserve the existing proxy config.

Only the NewFind gateway is recreated. The existing web/backend containers are
never restarted, rebuilt, or given new volumes/networks. A small oneshot timer
restores only this approved route if the existing proxy later reloads its image.
"""
import argparse
import copy
import json
import os
from pathlib import Path
import subprocess
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)
WEB = "talktofile-web-1"
ADMIN = "http://127.0.0.1:2019"


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs).stdout


def live_config():
    return json.loads(run(["docker", "exec", WEB, "wget", "-qO-", ADMIN + "/config/"]))


def load_config(config):
    run(["docker", "exec", "-i", WEB, "wget", "-qO-", "--post-file=/dev/stdin",
         "--header=Content-Type: application/json", ADMIN + "/load"],
        input=json.dumps(config).encode())


def save_once(path, data):
    path = Path(path)
    if path.exists():
        if path.read_bytes() != data:
            raise RuntimeError("Refusing to overwrite backup " + str(path))
        return
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(data)


def candidate_for(live, route):
    candidate = copy.deepcopy(live)
    host = route["match"][0]["host"][0]
    servers = [s for s in candidate["apps"]["http"]["servers"].values()
               if any(host in match.get("host", []) for r in s.get("routes", [])
                      for match in r.get("match", []))]
    if len(servers) != 1:
        raise RuntimeError("HTTPS host is ambiguous")
    routes = servers[0]["routes"]
    for existing in routes:
        if existing.get("match") == route["match"]:
            if existing != route:
                raise RuntimeError("An unrelated route occupies the approved prefix")
            return live, False
    original = copy.deepcopy(routes)
    routes.insert(0, route)
    assert routes[1:] == original
    return candidate, True


def validate(config):
    run(["docker", "run", "--rm", "--network", "none", "--memory", "128m", "--cpus", "0.25",
         "-i", "--entrypoint", "caddy", "talktofile-web", "validate", "--config", "/dev/stdin"],
        input=json.dumps(config).encode())


def verify(route):
    host = route["match"][0]["host"][0]
    prefix = route["handle"][0]["strip_path_prefix"]
    with urlopen(f"https://{host}/", timeout=20) as response:
        if response.status != 200:
            raise RuntimeError("Existing website health failed")
    with urlopen(f"https://{host}{prefix}/", timeout=20) as response:
        if response.status != 200 or json.load(response).get("status") != "ok":
            raise RuntimeError("NewFind HTTPS health failed")


def install_persistence():
    service = ("[Unit]\nDescription=Restore the approved NewFind proxy route\nAfter=docker.service\n"
               "[Service]\nType=oneshot\nWorkingDirectory=/opt/newfind\n"
               "ExecStart=/usr/bin/python3 /opt/newfind/backend/scripts/apply_proxy.py --ensure\n"
               "TimeoutStartSec=50\n")
    timer = ("[Unit]\nDescription=Keep the approved NewFind proxy route available\n"
             "[Timer]\nOnBootSec=30s\nOnUnitActiveSec=60s\n"
             "Unit=newfind-proxy-route.service\n[Install]\nWantedBy=timers.target\n")
    for name, content in [("service", service), ("timer", timer)]:
        path = Path("/etc/systemd/system/newfind-proxy-route." + name)
        if path.exists() and path.read_text() != content:
            raise RuntimeError("Unrecognized existing NewFind unit: " + str(path))
        path.write_text(content)
    run(["systemctl", "daemon-reload"])
    run(["systemctl", "enable", "--now", "newfind-proxy-route.timer"])


parser = argparse.ArgumentParser()
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--apply", action="store_true")
mode.add_argument("--ensure", action="store_true")
args = parser.parse_args()
template = json.loads(Path("caddy.candidate.json").read_text())
route = next(iter(template["apps"]["http"]["servers"].values()))["routes"][0]
if route.get("terminal") is not True or route["handle"][0].get("strip_path_prefix") != "/newfind-api":
    raise RuntimeError("Not the approved NewFind route")
live = live_config()
candidate, changed = candidate_for(live, route)
if args.ensure:
    if changed:
        validate(candidate)
        load_config(candidate)
        try:
            verify(route)
        except Exception:
            load_config(live)
            raise
    print("PASS approved route present; existing routes preserved")
    raise SystemExit(0)

before = json.loads(Path("caddy.before.json").read_text())
if live != before:
    raise RuntimeError("Active proxy changed since review; refusing to apply stale configuration")
validate(candidate)
save_once("caddy.apply-before.json", json.dumps(live, sort_keys=True).encode())
starts = run(["docker", "inspect", "talktofile-backend-1", WEB,
              "--format", "{{.Name}} {{.State.StartedAt}}"])
compose = ["docker", "compose", "-p", "newfind"]
run(compose + ["-f", "docker-compose.yml", "-f", "compose.proxy.yaml", "up", "-d",
               "--no-deps", "--no-build", "--wait", "--wait-timeout", "60", "gateway"])
try:
    upstream = route["handle"][1]["upstreams"][0]["dial"]
    health = json.loads(run(["docker", "exec", WEB, "wget", "-qO-", "http://" + upstream + "/"]))
    if health.get("status") != "ok":
        raise RuntimeError("Private upstream health failed")
    load_config(candidate)
    verify(route)
except Exception:
    load_config(live)
    run(compose + ["-f", "docker-compose.yml", "up", "-d", "--no-deps", "--no-build", "gateway"])
    raise
env = Path(".env")
previous = env.read_bytes()
save_once(".env.before-proxy", previous)
if b"COMPOSE_FILE=" in previous:
    raise RuntimeError("Unexpected Compose file override")
with env.open("ab") as handle:
    handle.write(b"\nCOMPOSE_FILE=docker-compose.yml:compose.proxy.yaml\n")
install_persistence()
after = run(["docker", "inspect", "talktofile-backend-1", WEB,
             "--format", "{{.Name}} {{.State.StartedAt}}"])
if starts != after:
    raise RuntimeError("Existing container start times changed")
print("PASS NewFind HTTPS route, existing website HTTP 200 and unchanged production container start times")
print("PASS route persistence enabled; only NewFind gateway was recreated")
