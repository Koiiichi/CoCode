#!/bin/bash

# Revoke trusted access for Git automation scripts
# Created by Koichi/Muneeb

# Resolve directory of this script (assumes it's in scripts/)
SCRIPT_DIR="$( cd -- "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
TRUST_FLAG="$SCRIPT_DIR/.internal/authorized.flag"

if [[ -f "$TRUST_FLAG" ]]; then
  rm "$TRUST_FLAG"
  echo "Trusted access revoked. You will now be prompted for authorization."
else
  echo "No trusted flag found. You are already in untrusted mode."
fi