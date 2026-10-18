#!/bin/sh
# Install the Everhour plugin in every supported CLI on PATH (Claude Code, Codex).
#   curl -fsSL https://raw.githubusercontent.com/pccly/everhour-plugin/main/install.sh | sh
set -eu

REPO="pccly/everhour-plugin"
PLUGIN="everhour@everhour-plugin"
installed=""

if command -v claude >/dev/null 2>&1; then
  claude plugin marketplace add "$REPO"
  claude plugin install "$PLUGIN"
  installed="$installed Claude Code"
fi

if command -v codex >/dev/null 2>&1; then
  codex plugin marketplace add "$REPO"
  codex plugin add "$PLUGIN"
  installed="$installed Codex"
fi

if [ -z "$installed" ]; then
  echo "Neither claude nor codex is on PATH. Install one of them first." >&2
  exit 1
fi

cat <<EOF

Installed for:$installed
Next, give it your Everhour API token (Everhour > Settings > My Profile > Application Access):
  Claude Code: run /plugin configure $PLUGIN
  Any CLI: export EVERHOUR_API_KEY=<token> before starting it
  macOS, both CLIs: security add-generic-password -a "\$USER" -s everhour-api-key -w
EOF
