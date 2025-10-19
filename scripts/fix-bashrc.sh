#!/bin/bash

# Fix .bashrc to only prompt for GPG passphrase in CoCode repository
# This removes the global token export and replaces it with a conditional one

SHELL_PROFILE="$HOME/.bashrc"
COCODE_REPO_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Fixing .bashrc to only load token in CoCode repository..."
echo "Repository path: $COCODE_REPO_PATH"

# Backup the current .bashrc
if [[ -f "$SHELL_PROFILE" ]]; then
  cp "$SHELL_PROFILE" "$SHELL_PROFILE.backup.$(date +%Y%m%d_%H%M%S)"
  echo "Backed up $SHELL_PROFILE"
else
  echo "No .bashrc found, creating new one..."
  touch "$SHELL_PROFILE"
fi

# Remove the old global export line
OLD_EXPORT_LINE='export GIT_SCRIPT_MASTER_TOKEN=$(~/.git-script-auth/get-token.sh)'
if grep -F "$OLD_EXPORT_LINE" "$SHELL_PROFILE" >/dev/null 2>&1; then
  # Use grep -v to remove the line
  grep -v -F "$OLD_EXPORT_LINE" "$SHELL_PROFILE" > "$SHELL_PROFILE.tmp"
  mv "$SHELL_PROFILE.tmp" "$SHELL_PROFILE"
  echo "✓ Removed old global token export"
else
  echo "Old export line not found (already removed or never existed)"
fi

# Create the new conditional export block
EXPORT_BLOCK="# CoCode Git Script Token - Only loads in CoCode repository
if [[ \"\$PWD\" == \"$COCODE_REPO_PATH\"* ]]; then
  if [[ -z \"\$GIT_SCRIPT_MASTER_TOKEN\" ]]; then
    export GIT_SCRIPT_MASTER_TOKEN=\$(~/.git-script-auth/get-token.sh 2>/dev/null)
  fi
fi"

# Add the new block if not already present
if ! grep -q "CoCode Git Script Token" "$SHELL_PROFILE" 2>/dev/null; then
  echo "" >> "$SHELL_PROFILE"
  echo "$EXPORT_BLOCK" >> "$SHELL_PROFILE"
  echo "✓ Added conditional token export"
else
  echo "Conditional token export already exists"
fi

echo ""
echo "✓ Done! The GPG passphrase prompt will now only appear when you:"
echo "  1. Open a terminal in the CoCode directory"
echo "  2. cd into the CoCode directory"
echo ""
echo "To apply changes to your current terminal, run:"
echo "  source $SHELL_PROFILE"
echo ""
echo "Or simply close and reopen your terminal."
