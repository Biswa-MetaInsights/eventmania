#!/usr/bin/env bash
# Read-only server inspection. Does not print container environment variables.
set -euo pipefail
date -Is
free -m
df -h / /opt/newfind
swapon --show
ss -ltn
docker version --format '{{.Server.Version}}'
docker compose version
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'
docker volume ls --filter label=com.docker.compose.project=newfind
docker network ls --filter label=com.docker.compose.project=newfind
for container in talktofile-backend-1 talktofile-web-1; do
  docker inspect --format '{{.Name}} {{.State.Status}} {{.State.StartedAt}}' "$container"
done
# Identify the proxy's config mounts and network mode without disclosing secrets.
docker ps --filter ancestor=caddy --format '{{.ID}}' | while read -r proxy; do
  docker inspect --format '{{.Name}} {{json .Mounts}} {{.HostConfig.NetworkMode}}' "$proxy"
done
if [ -d /opt/newfind/.git ]; then
  git -C /opt/newfind status --short
  git -C /opt/newfind rev-parse HEAD
fi
