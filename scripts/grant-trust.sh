#!/bin/bash

# Re-grant trusted access
TRUST_FLAG="$(dirname "$0")/.internal/authorized.flag"

touch "$TRUST_FLAG"
echo "Trusted access restored. You will no longer be prompted for authorization."
