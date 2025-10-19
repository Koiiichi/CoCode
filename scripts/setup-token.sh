#!/bin/bash

# Secure Token Setup for Git Scripts
# Created by Koichi/Muneeb

# Ensure script is run by the authorized user
if [[ "$(whoami)" != "Muneeb Hassan" ]]; then
  echo "Error: This setup must be run by Muneeb Hassan."
  exit 1
fi

# Create secure directory for tokens
TOKEN_DIR="$HOME/.git-script-auth"
mkdir -p "$TOKEN_DIR"
chmod 700 "$TOKEN_DIR"

# Prompt for token with masked input
read -sp "Enter your authorization token: " TOKEN
echo

# Verify token is not empty
if [[ -z "$TOKEN" ]]; then
  echo "Error: Token cannot be empty."
  exit 1
fi

# Encrypt and store token
echo "$TOKEN" | gpg --symmetric --cipher-algo AES256 > "$TOKEN_DIR/script-token.gpg"
chmod 600 "$TOKEN_DIR/script-token.gpg"

# Create helper script to retrieve token
cat << 'EOF' > "$TOKEN_DIR/get-token.sh"
#!/bin/bash
TOKEN_FILE="$HOME/.git-script-auth/script-token.gpg"

# Decrypt and output token
gpg --decrypt "$TOKEN_FILE" 2>/dev/null
EOF
chmod 700 "$TOKEN_DIR/get-token.sh"

echo "Token securely stored. You can now use scripts that require authorization."
echo "Token will be retrieved using the secure method."

# Auto-export token in shell profile (only for CoCode repo)
SHELL_PROFILE="$HOME/.bashrc"  # Change to .zshrc if using Zsh

# Get the absolute path of the CoCode repository
COCODE_REPO_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create a conditional export that only runs in the CoCode directory
EXPORT_BLOCK="# CoCode Git Script Token - Only loads in CoCode repository
if [[ \"\$PWD\" == \"$COCODE_REPO_PATH\"* ]]; then
  if [[ -z \"\$GIT_SCRIPT_MASTER_TOKEN\" ]]; then
    export GIT_SCRIPT_MASTER_TOKEN=\$(~/.git-script-auth/get-token.sh 2>/dev/null)
  fi
fi"

# Check if the old line exists and needs to be replaced
OLD_EXPORT_LINE='export GIT_SCRIPT_MASTER_TOKEN=$(~/.git-script-auth/get-token.sh)'
if grep -Fxq "$OLD_EXPORT_LINE" "$SHELL_PROFILE" 2>/dev/null; then
  # Remove old line
  sed -i "\|$OLD_EXPORT_LINE|d" "$SHELL_PROFILE" 2>/dev/null || grep -v "$OLD_EXPORT_LINE" "$SHELL_PROFILE" > "$SHELL_PROFILE.tmp" && mv "$SHELL_PROFILE.tmp" "$SHELL_PROFILE"
  echo "Removed old global token export from $SHELL_PROFILE"
fi

# Add new conditional block if not present
if ! grep -q "CoCode Git Script Token" "$SHELL_PROFILE" 2>/dev/null; then
  echo "" >> "$SHELL_PROFILE"
  echo "$EXPORT_BLOCK" >> "$SHELL_PROFILE"
  echo "Token will now only load when in the CoCode directory via $SHELL_PROFILE"
  echo "Run: source $SHELL_PROFILE"
else
  echo "Conditional token export already exists in $SHELL_PROFILE"
fi

# Create authorized.flag for trusted local usage
TRUSTED_FLAG="$HOME/.git-script-auth/authorized.flag"

if [[ "$(whoami)" == "Muneeb Hassan" ]]; then
  touch "$TRUSTED_FLAG"
  echo "Trusted access enabled. You will not be prompted for authorization on this machine."
fi
