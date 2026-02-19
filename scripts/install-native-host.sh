#!/usr/bin/env bash
set -euo pipefail

# Install the M365 Workbench native messaging host for Chrome/Edge on Linux/macOS.
# Usage: ./install-native-host.sh [extension-id]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MCP_SERVER_DIR="$PROJECT_DIR/mcp-server"
HOST_NAME="com.m365workbench.relay"

# Build the MCP server if not already built
if [ ! -f "$MCP_SERVER_DIR/dist/native-host.js" ]; then
  echo "Building MCP server..."
  cd "$MCP_SERVER_DIR"
  npm install
  npm run build
  cd "$PROJECT_DIR"
fi

NATIVE_HOST_PATH="$MCP_SERVER_DIR/dist/native-host.js"

# Get extension ID from argument or prompt
EXTENSION_ID="${1:-}"
if [ -z "$EXTENSION_ID" ]; then
  echo "Enter your Chrome extension ID (find it at chrome://extensions):"
  read -r EXTENSION_ID
fi

if [ -z "$EXTENSION_ID" ]; then
  echo "Error: Extension ID is required."
  exit 1
fi

# Determine target directory based on OS
OS="$(uname -s)"
case "$OS" in
  Linux*)
    CHROME_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    EDGE_DIR="$HOME/.config/microsoft-edge/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/.config/chromium/NativeMessagingHosts"
    ;;
  Darwin*)
    CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    EDGE_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
    ;;
  *)
    echo "Unsupported OS: $OS. Use install-native-host.ps1 for Windows."
    exit 1
    ;;
esac

# Create a wrapper script that runs the native host with node
WRAPPER_PATH="$MCP_SERVER_DIR/dist/native-host-wrapper.sh"
cat > "$WRAPPER_PATH" << WRAPPER
#!/usr/bin/env bash
exec node "$NATIVE_HOST_PATH" "\$@"
WRAPPER
chmod +x "$WRAPPER_PATH"

# Generate the manifest
generate_manifest() {
  local target_dir="$1"
  mkdir -p "$target_dir"

  cat > "$target_dir/$HOST_NAME.json" << MANIFEST
{
  "name": "$HOST_NAME",
  "description": "M365 Workbench Native Messaging Host",
  "path": "$WRAPPER_PATH",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXTENSION_ID/"]
}
MANIFEST

  echo "Installed manifest to $target_dir/$HOST_NAME.json"
}

# Install for each browser that has a config directory
INSTALLED=0

if [ -d "$(dirname "$CHROME_DIR")" ]; then
  generate_manifest "$CHROME_DIR"
  INSTALLED=1
fi

if [ -d "$(dirname "$EDGE_DIR")" ]; then
  generate_manifest "$EDGE_DIR"
  INSTALLED=1
fi

if [ -d "$(dirname "$CHROMIUM_DIR")" ]; then
  generate_manifest "$CHROMIUM_DIR"
  INSTALLED=1
fi

if [ "$INSTALLED" -eq 0 ]; then
  echo "No browser config directories found. Installing for Chrome by default."
  generate_manifest "$CHROME_DIR"
fi

echo ""
echo "Native messaging host installed successfully."
echo "Extension ID: $EXTENSION_ID"
echo "Host path: $WRAPPER_PATH"
echo ""
echo "Restart your browser for changes to take effect."
