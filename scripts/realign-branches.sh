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
    echo "  --dry-run              Simulate operations without making changes"
    echo "  --force                Allow destructive operations (required for --reverse)"
    echo "  --keep-backups         Preserve backup branches after operation"
    echo "  --log FILE             Log operations to specified file"
    echo "  --help                 Display this help message"
    echo
    echo "Protected Branches: main, master (always excluded from operations)"
    echo
    echo "Examples:"
    echo "  $0 --reverse 2 --force"
    echo "    Reset all non-protected branches back 2 commits"
    echo
    echo "  $0 --forward 5 --base main"
    echo "    Fast-forward branches to 5th commit from main"
    echo
    echo "  $0 --dry-run --forward 3 --base develop --exclude feature/global-cursor"
    echo "    Simulate forwarding branches, excluding 'feature/global-cursor'"
    exit 0
}

# === Config ===
PROTECTED_BRANCHES=("main" "master")
EXCLUDE_BRANCHES=()
REVERSE_COUNT=""
FORWARD_COUNT=""
BASE_BRANCH=""
DRY_RUN=false
FORCE=false
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
    --force)
      FORCE=true
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

if [ -n "$REVERSE_COUNT" ] && ! $FORCE && ! $DRY_RUN; then
  echo "Error: --force is required for destructive --reverse operations."
  exit 1
fi

if [ -n "$FORWARD_COUNT" ] && [ -z "$BASE_BRANCH" ]; then
  echo "Error: --base must be provided when using --forward."
  exit 1
fi

if [ -n "$LOG_FILE" ]; then
  echo "Realign Log - $(date)" >> "$LOG_FILE"
fi

# === Authorization Check ===
validate_authorization

# === Prepare branch list ===
ALL_BRANCHES=$(git for-each-ref --format='%(refname:short)' refs/heads/)
TARGET_BRANCHES=()

for BRANCH in $ALL_BRANCHES; do
  SKIP=false
  for PROTECTED in "${PROTECTED_BRANCHES[@]}"; do
    if [ "$BRANCH" = "$PROTECTED" ]; then
      echo "Skipping protected branch: $BRANCH"
      SKIP=true
    fi
  done
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
for BRANCH in "${TARGET_BRANCHES[@]}"; do
  echo "Processing: $BRANCH"
  CURRENT_HASH=$(git rev-parse "$BRANCH")

  if [ -n "$REVERSE_COUNT" ]; then
    if $DRY_RUN; then
      echo "[Dry Run] Would reset $BRANCH from $CURRENT_HASH to HEAD~$REVERSE_COUNT"
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
  fi
done

# === Restore original branch ===
git checkout - >/dev/null 2>&1

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