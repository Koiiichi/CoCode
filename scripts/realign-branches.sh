#!/bin/bash

# === Secure Authorization ===
source "$(dirname "$0")/.internal/authorize.sh"

# === Help Function ===
show_help() {
    echo "Git Branch Realignment Tool"
    echo "Created by Koichi/Muneeb"
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --reverse COUNT        Reset branches backward by COUNT commits"
    echo "  --forward COUNT        Fast-forward branches to COUNT commits from base"
    echo "  --base BRANCH          Specify base branch for forward operations"
    echo "  --exclude BRANCH(ES)   Exclude specific branches from operation"
    echo "  --include-protected    Allow operations on protected branches (requires confirmation)"
    echo "  --update-remote        Push changes to remote after operation (use with caution)"
    echo "  --no-remote-check      Skip remote divergence warnings"
    echo "  --dry-run              Simulate operations without making changes"
    echo "  --keep-backups         Preserve backup branches after operation"
    echo "  --log FILE             Log operations to specified file"
    echo "  --help                 Display this help message"
    echo
    echo "Protected Branches: main, master (requires --include-protected to modify)"
    echo
    echo "Examples:"
    echo "  $0 --reverse 2"
    echo "    Reset all non-protected branches back 2 commits"
    echo
    echo "  $0 --forward 5 --base main"
    echo "    Fast-forward branches to 5th commit from main"
    echo
    echo "  $0 --reverse 2 --include-protected --update-remote"
    echo "    Reset ALL branches back 2 commits and push changes to remote"
    exit 0
}

# === Config ===
PROTECTED_BRANCHES=("main" "master")
EXCLUDE_BRANCHES=()
REVERSE_COUNT=""
FORWARD_COUNT=""
BASE_BRANCH=""
DRY_RUN=false
INCLUDE_PROTECTED=false
UPDATE_REMOTE=false
NO_REMOTE_CHECK=false
KEEP_BACKUPS=false
LOG_FILE=""
BACKUP_BRANCHES=()

# === Parse Arguments ===
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help)
      show_help
      ;;
    --reverse)
      shift
      REVERSE_COUNT="$1"
      shift
      ;;
    --forward)
      shift
      FORWARD_COUNT="$1"
      shift
      ;;
    --base)
      shift
      BASE_BRANCH="$1"
      shift
      ;;
    --exclude)
      shift
      while [[ $# -gt 0 && "$1" != --* ]]; do
        EXCLUDE_BRANCHES+=("$1")
        shift
      done
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --include-protected)
      INCLUDE_PROTECTED=true
      shift
      ;;
    --update-remote)
      UPDATE_REMOTE=true
      shift
      ;;
    --no-remote-check)
      NO_REMOTE_CHECK=true
      shift
      ;;
    --force)
      # Keeping for backward compatibility
      shift
      ;;
    --keep-backups)
      KEEP_BACKUPS=true
      shift
      ;;
    --log)
      shift
      LOG_FILE="$1"
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Use --help for usage information."
      exit 1
      ;;
  esac
done

# === Validation ===
if [ -n "$REVERSE_COUNT" ] && [ -n "$FORWARD_COUNT" ]; then
  echo "Error: Cannot use --reverse and --forward together."
  exit 1
fi

if [ -n "$FORWARD_COUNT" ] && [ -z "$BASE_BRANCH" ]; then
  echo "Error: --base must be provided when using --forward."
  exit 1
fi

if $UPDATE_REMOTE && ! $DRY_RUN; then
  echo "WARNING: You are about to push changes to remote branches."
  echo "This will overwrite remote history and may affect other developers."
  echo
  read -p "Type 'PUSH-REMOTE' to confirm this potentially disruptive action: " CONFIRMATION
  if [ "$CONFIRMATION" != "PUSH-REMOTE" ]; then
    echo "Remote update cancelled. Proceeding with local changes only."
    UPDATE_REMOTE=false
  fi
fi

if [ -n "$LOG_FILE" ]; then
  echo "Realign Log - $(date)" >> "$LOG_FILE"
fi

# === Authorization Check ===
validate_authorization

# === Protected Branch Confirmation ===
if $INCLUDE_PROTECTED && ! $DRY_RUN; then
  echo "WARNING: You are about to modify protected branches."
  PROTECTED_LIST=$(printf "%s, " "${PROTECTED_BRANCHES[@]}")
  PROTECTED_LIST=${PROTECTED_LIST%, }
  echo "Protected branches: $PROTECTED_LIST"
  echo
  read -p "Type 'CONFIRM' to proceed: " CONFIRMATION
  if [ "$CONFIRMATION" != "CONFIRM" ]; then
    echo "Operation cancelled."
    exit 1
  fi
  echo "Proceeding with protected branch modification..."
fi

# === Remote Check ===
HAS_REMOTES=$(git remote)
if [ -n "$HAS_REMOTES" ] && ! $NO_REMOTE_CHECK && ! $UPDATE_REMOTE; then
  echo "WARNING: This repository has remotes and VS Code will show sync changes after operations."
  echo "Options to handle this:"
  echo "  1. Add --update-remote to push changes to remotes"
  echo "  2. Add --no-remote-check to suppress this warning"
  echo "  3. After running this script, in VS Code choose 'Push' instead of 'Pull' to update remotes"
  echo
  read -p "Press Enter to continue or Ctrl+C to abort..."
fi

# === Prepare branch list ===
ALL_BRANCHES=$(git for-each-ref --format='%(refname:short)' refs/heads/)
TARGET_BRANCHES=()

for BRANCH in $ALL_BRANCHES; do
  SKIP=false
  # Skip protected branches unless specifically included
  if ! $INCLUDE_PROTECTED; then
    for PROTECTED in "${PROTECTED_BRANCHES[@]}"; do
      if [ "$BRANCH" = "$PROTECTED" ]; then
        echo "Skipping protected branch: $BRANCH (use --include-protected to modify)"
        SKIP=true
      fi
    done
  fi
  # Process exclusions
  for EX in "${EXCLUDE_BRANCHES[@]}"; do
    if [ "$BRANCH" = "$EX" ]; then
      echo "Excluding branch: $BRANCH"
      SKIP=true
    fi
  done
  if ! $SKIP; then
    TARGET_BRANCHES+=("$BRANCH")
  fi
done

# === Perform Operations ===
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
for BRANCH in "${TARGET_BRANCHES[@]}"; do
  IS_PROTECTED=false
  for PROTECTED in "${PROTECTED_BRANCHES[@]}"; do
    if [ "$BRANCH" = "$PROTECTED" ]; then
      IS_PROTECTED=true
      break
    fi
  done
  
  echo "Processing: $BRANCH$([ "$IS_PROTECTED" = true ] && echo " (protected)")"
  CURRENT_HASH=$(git rev-parse "$BRANCH")

  # Check if branch has a remote tracking branch
  REMOTE_BRANCH=$(git for-each-ref --format='%(upstream:short)' refs/heads/"$BRANCH")
  HAS_REMOTE=false
  if [ -n "$REMOTE_BRANCH" ]; then
    HAS_REMOTE=true
  fi

  if [ -n "$REVERSE_COUNT" ]; then
    if $DRY_RUN; then
      echo "[Dry Run] Would reset $BRANCH from $CURRENT_HASH to HEAD~$REVERSE_COUNT"
      if $HAS_REMOTE && $UPDATE_REMOTE; then
        echo "[Dry Run] Would force push changes to $REMOTE_BRANCH"
      elif $HAS_REMOTE; then
        echo "[Dry Run] NOTE: Remote $REMOTE_BRANCH would need manual sync"
      fi
      [ -n "$LOG_FILE" ] && echo "[Dry Run] $BRANCH: HEAD~$REVERSE_COUNT" >> "$LOG_FILE"
      continue
    fi

    git branch "backup/$BRANCH-before-realign" "$BRANCH"
    BACKUP_BRANCHES+=("backup/$BRANCH-before-realign")
    git checkout "$BRANCH" || continue
    git reset --hard "HEAD~$REVERSE_COUNT" || continue
    NEW_HASH=$(git rev-parse "$BRANCH")
    echo "$BRANCH: $CURRENT_HASH → $NEW_HASH"
    [ -n "$LOG_FILE" ] && echo "$BRANCH: $CURRENT_HASH → $NEW_HASH" >> "$LOG_FILE"

    # Handle remote
    if $HAS_REMOTE && $UPDATE_REMOTE; then
      echo "Pushing changes to $REMOTE_BRANCH..."
      git push --force origin "$BRANCH"
      echo "Remote updated."
      [ -n "$LOG_FILE" ] && echo "Updated remote $REMOTE_BRANCH" >> "$LOG_FILE"
    elif $HAS_REMOTE; then
      echo "NOTE: Branch $BRANCH has remote $REMOTE_BRANCH that will require manual sync"
    fi
  fi

  if [ -n "$FORWARD_COUNT" ]; then
    BASE_HASH=$(git rev-parse "$BASE_BRANCH")
    TARGET_COMMIT=$(git rev-list --reverse "$BASE_BRANCH" | sed -n "${FORWARD_COUNT}p")

    if [ -z "$TARGET_COMMIT" ]; then
      echo "Error: $BASE_BRANCH does not have $FORWARD_COUNT commits"
      continue
    fi

    COMMON_ANCESTOR=$(git merge-base "$BRANCH" "$BASE_BRANCH")
    if [ "$COMMON_ANCESTOR" != "$BASE_HASH" ]; then
      echo "Skipping $BRANCH — diverged from $BASE_BRANCH"
      [ -n "$LOG_FILE" ] && echo "Skipped $BRANCH (diverged from base)" >> "$LOG_FILE"
      continue
    fi

    if $DRY_RUN; then
      echo "[Dry Run] Would fast-forward $BRANCH to $TARGET_COMMIT"
      if $HAS_REMOTE && $UPDATE_REMOTE; then
        echo "[Dry Run] Would force push changes to $REMOTE_BRANCH"
      elif $HAS_REMOTE; then
        echo "[Dry Run] NOTE: Remote $REMOTE_BRANCH would need manual sync"
      fi
      [ -n "$LOG_FILE" ] && echo "[Dry Run] $BRANCH: → $TARGET_COMMIT" >> "$LOG_FILE"
      continue
    fi

    git branch "backup/$BRANCH-before-realign" "$BRANCH"
    BACKUP_BRANCHES+=("backup/$BRANCH-before-realign")
    git checkout "$BRANCH" || continue
    git reset --hard "$TARGET_COMMIT" || continue
    NEW_HASH=$(git rev-parse "$BRANCH")
    echo "$BRANCH: $CURRENT_HASH → $NEW_HASH"
    [ -n "$LOG_FILE" ] && echo "$BRANCH: $CURRENT_HASH → $NEW_HASH" >> "$LOG_FILE"

    # Handle remote
    if $HAS_REMOTE && $UPDATE_REMOTE; then
      echo "Pushing changes to $REMOTE_BRANCH..."
      git push --force origin "$BRANCH"
      echo "Remote updated."
      [ -n "$LOG_FILE" ] && echo "Updated remote $REMOTE_BRANCH" >> "$LOG_FILE"
    elif $HAS_REMOTE; then
      echo "NOTE: Branch $BRANCH has remote $REMOTE_BRANCH that will require manual sync"
    fi
  fi
done

# === Restore original branch ===
git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || git checkout - >/dev/null 2>&1

echo
echo "Completed. ${#TARGET_BRANCHES[@]} branches processed."

if ! $DRY_RUN && ! $KEEP_BACKUPS; then
  for B in "${BACKUP_BRANCHES[@]}"; do
    git branch -D "$B" >/dev/null 2>&1
  done
  echo "Backup branches deleted."
fi

if ! $DRY_RUN && $KEEP_BACKUPS; then
  echo "Backups preserved:"
  for B in "${BACKUP_BRANCHES[@]}"; do
    echo " - $B"
  done
fi

# === Final Instructions ===
if [ -n "$HAS_REMOTES" ] && ! $UPDATE_REMOTE && ! $DRY_RUN; then
  echo
  echo "IMPORTANT: For VS Code sync notifications after this operation:"
  echo "  - If you want to KEEP the changes made by this script: Choose PUSH"
  echo "  - If you want to UNDO the changes made by this script: Choose PULL"
  echo
  echo "You can add --update-remote to automatically push changes to remote branches."
fi