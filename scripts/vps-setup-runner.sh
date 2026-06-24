#!/usr/bin/env bash
#
# One-time setup of the GitHub Actions SELF-HOSTED runner on the Manokip VPS.
# After this, frontend/backend deploy locally on the server — no SSH, no secrets.
#
# Run as root ON THE VPS:
#     bash vps-setup-runner.sh <REGISTRATION_TOKEN>
#
# Get <REGISTRATION_TOKEN> from:
#     GitHub repo → Settings → Actions → Runners → "New self-hosted runner"
#     → Linux / x64 → copy the value that appears after `--token` in the
#       ./config.sh command (it looks like  A...  and expires in ~1 hour).
#
set -euo pipefail

TOKEN="${1:?Usage: bash vps-setup-runner.sh <REGISTRATION_TOKEN>}"
REPO_URL="https://github.com/mardonme/Manokip"
RUNNER_DIR="/opt/actions-runner"
LABELS="manokip"
NAME="manokip-vps"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (the deploy writes to /opt/manokip and runs docker)." >&2
  exit 1
fi

# git is needed by actions/checkout; rsync/docker are used by the workflows.
command -v git   >/dev/null || { apt-get update && apt-get install -y git; }
command -v rsync >/dev/null || { apt-get update && apt-get install -y rsync; }

# Resolve the latest runner release tag (e.g. 2.319.1).
VER="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
        | grep -oP '"tag_name":\s*"v\K[0-9.]+')"
echo "→ Installing GitHub Actions runner v${VER}"

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
curl -fsSL -o runner.tar.gz \
  "https://github.com/actions/runner/releases/download/v${VER}/actions-runner-linux-x64-${VER}.tar.gz"
tar xzf runner.tar.gz && rm -f runner.tar.gz

# Pull in native deps the runner needs (libicu, etc.).
./bin/installdependencies.sh || true

# Register against the repo. --replace lets you re-run this script safely.
export RUNNER_ALLOW_RUNASROOT=1
./config.sh --url "$REPO_URL" --token "$TOKEN" \
            --labels "$LABELS" --name "$NAME" \
            --unattended --replace

# Run as a systemd service (as root) so it stays up and survives reboots.
./svc.sh install
./svc.sh start
./svc.sh status

echo
echo "✅ Runner '${NAME}' (label: ${LABELS}) is installed and running."
echo "   Verify on GitHub: Settings → Actions → Runners (should show 'Idle')."
