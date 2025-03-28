#!/bin/bash
TOKEN_FILE="$HOME/.git-script-auth/script-token.gpg"

# Decrypt and output token
gpg --decrypt "$TOKEN_FILE" 2>/dev/null
