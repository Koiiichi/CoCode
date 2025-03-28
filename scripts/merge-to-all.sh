#!/bin/bash

# === Config: Authorized user ===
AUTHORIZED_USER="Muneeb Hassan"
CURRENT_USER=$(git config user.name)

if [ "$CURRENT_USER" != "$AUTHORIZED_USER" ]; then
  echo "Unauthorized: Only $AUTHORIZED_USER is allowed to run this script."
  exit 1
fi

# === Parse arguments ===
SOURCE_BRANCH=""
DRY_RUN=false
EXCLUDE_BRANCHES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --exclude)
      shift
      while [[ $# -gt 0 && "$1" != --* ]]; do
        EXCLUDE_BRANCHES+=("$1")
        shift
      done
      ;;
    *)
      if [ -z "$SOURCE_BRANCH" ]; then
        SOURCE_BRANCH="$1"
        shift
      else
        echo "Unexpected argument: $1"
        exit 1
      fi
      ;;
  esac
done

if [ -z "$SOURCE_BRANCH" ]; then
  echo "Usage: $0 <source-branch> [--dry-run] [--exclude <branch1> <branch2> ...]"
  exit 1
fi

# === Verify source branch exists ===
git show-ref --verify --quiet refs/heads/$SOURCE_BRANCH
if [ $? -ne 0 ]; then
  echo "Source branch '$SOURCE_BRANCH' does not exist locally."
  exit 1
fi

# === Get all local branches except source and user-excluded branches ===
TARGET_BRANCHES=$(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v "^$SOURCE_BRANCH\$")

for EX in "${EXCLUDE_BRANCHES[@]}"; do
  TARGET_BRANCHES=$(echo "$TARGET_BRANCHES" | grep -v "^$EX\$")
done

if $DRY_RUN && [ "${#EXCLUDE_BRANCHES[@]}" -gt 0 ]; then
  echo "[Dry Run] Excluding the following branches:"
  for EX in "${EXCLUDE_BRANCHES[@]}"; do
    echo "  - $EX (manually excluded by --exclude)"
  done
  echo
fi

# === Checkout and update source branch ===
git checkout $SOURCE_BRANCH || exit 1
git pull origin $SOURCE_BRANCH || exit 1

# === Merge source into each target ===
for TARGET in $TARGET_BRANCHES; do
  # Check if TARGET is ahead of SOURCE
  AHEAD_COUNT=$(git rev-list --left-right --count "$SOURCE_BRANCH...$TARGET" | awk '{print $2}')
  if [ "$AHEAD_COUNT" -gt 0 ]; then
    echo "Skipping '$TARGET' — it is ahead of '$SOURCE_BRANCH'"
    if $DRY_RUN; then
      echo "[Dry Run] Skipped '$TARGET' to avoid overwriting newer commits"
    fi
    continue
  fi

  echo "Merging '$SOURCE_BRANCH' into '$TARGET'..."

  if $DRY_RUN; then
    echo "[Dry Run] Would run: git checkout $TARGET"
    echo "[Dry Run] Would run: git pull origin $TARGET"
    echo "[Dry Run] Would run: git merge $SOURCE_BRANCH -m \"Merge $SOURCE_BRANCH into $TARGET\""
    echo "[Dry Run] Would run: git push origin $TARGET"
    echo
  else
    git checkout $TARGET || exit 1
    git pull origin $TARGET || exit 1
    git merge $SOURCE_BRANCH -m "Merge $SOURCE_BRANCH into $TARGET"
    if [ $? -ne 0 ]; then
      echo "Merge conflict in branch '$TARGET'. Resolve manually."
      exit 1
    fi
    git push origin $TARGET || exit 1
  fi
done

git checkout $SOURCE_BRANCH