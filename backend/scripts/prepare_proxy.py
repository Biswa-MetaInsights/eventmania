"""Prepare and validate an additive proxy candidate; never apply live changes."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--host", required=True)
parser.add_argument("--bind", required=True)
parser.add_argument("--prefix", default="/newfind-api")
parser.add_argument("--source", type=Path, default=Path("caddy.before.json"))
parser.add_argument("--image", default="talktofile-web")
args = parser.parse_args()
if not re.fullmatch(r"[a-z0-9.-]+", args.host):
    parser.error("A plain lowercase hostname is required")
if not re.fullmatch(r"/[a-z0-9-]+", args.prefix):
    parser.error("A single URL path prefix is required")
if not ipaddress.ip_address(args.bind).is_private:
    parser.error("The gateway must bind to a private host interface")

before = json.loads(args.source.read_text())
candidate = json.loads(json.dumps(before))
servers = candidate["apps"]["http"]["servers"]
matching = [server for server in servers.values()
            if any(args.host in match.get("host", []) for route in server.get("routes", [])
                   for match in route.get("match", []))]
if len(matching) != 1:
    raise RuntimeError("Cannot unambiguously identify the existing HTTPS host")
server = matching[0]
original = list(server["routes"])
route = {
    "match": [{"host": [args.host], "path": [args.prefix, args.prefix + "/*"]}],
    "handle": [
        {"handler": "rewrite", "strip_path_prefix": args.prefix},
        {"handler": "reverse_proxy", "upstreams": [{"dial": args.bind + ":18000"}]},
    ],
    "terminal": True,
}
server["routes"].insert(0, route)
assert server["routes"][1:] == original
for path, content in [
    (Path("caddy.candidate.json"), json.dumps(candidate, indent=2)),
    (Path("compose.proxy.yaml"), "services:\n  gateway:\n    ports: !override\n"
     "      - 127.0.0.1:18000:8000\n      - " + args.bind + ":18000:8000\n"),
]:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as file:
        file.write(content + "\n")

# Validation runs in a separate disposable container, without networking or
# production volumes. It neither reloads the active proxy nor changes its files.
subprocess.run([
    "docker", "run", "--rm", "--network", "none", "--memory", "128m", "--cpus", "0.25",
    "-i", "--entrypoint", "caddy", args.image, "validate", "--config", "/dev/stdin",
], input=json.dumps(candidate).encode(), check=True)
subprocess.run([
    "docker", "compose", "-p", "newfind", "-f", "docker-compose.yml", "-f",
    "compose.proxy.yaml", "config", "--quiet",
], check=True)
print("PASS candidate validation; existing routes preserved; no live changes applied")
