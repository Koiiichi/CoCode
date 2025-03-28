#!/bin/bash

# Authorization Handler
# Created by Koichi/Muneeb

validate_authorization() {
    # === Config ===
    # Allow bypass if explicitly disabled
    if [[ "$GIT_SCRIPT_AUTH_DISABLE" == "1" ]]; then
        return 0
    fi

    # Resolve path to where this script physically lives (not where it was sourced from)
    SCRIPT_DIR="$( cd -- "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    TRUST_FLAG="$SCRIPT_DIR/authorized.flag"

    # Check for trusted flag
    if [[ -f "$TRUST_FLAG" ]]; then
        return 0
    fi

    # Require master token
    if [[ -z "$GIT_SCRIPT_MASTER_TOKEN" ]]; then
        echo "Error: Authorization token not set."
        echo "Set GIT_SCRIPT_MASTER_TOKEN environment variable to authorize."
        exit 1
    fi

    # Prompt user
    read -sp "Enter authorization token to proceed: " input_token
    echo
    if [[ "$input_token" != "$GIT_SCRIPT_MASTER_TOKEN" ]]; then
        echo "Unauthorized access attempt."
        exit 1
    fi
}