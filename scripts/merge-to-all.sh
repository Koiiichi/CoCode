#!/bin/bash

# === Config: Authorized user ===
AUTHORIZED_USER="Muneeb Hassan"
CURRENT_USER=$(git config user.name)

if [ "$CURRENT_USER" != "$AUTHORIZED_USER" ]; then
  echo "Unauthorized: Only $AUTHORIZED_USER is allowed to run this script."
  exit 1
fi

# === Parse arguments ===
if [ -z "$1" ]; then
  echo "Usage: $0 <source-branch> [--dry-run]"
  exit 1
fi

SOURCE_BRANCH="$1"
DRY_RUN=false

if [ "$2" == "--dry-run" ]; then
  DRY_RUN=true
  echo "[Dry Run] No merges will be performed."
fi

# === Verify source branch exists ===
git show-ref --verify --quiet refs/heads/$SOURCE_BRANCH
if [ $? -ne 0 ]; then
  echo "Source branch '$SOURCE_BRANCH' does not exist locally."
  exit 1
fi

# === Get all local branches except source ===
TARGET_BRANCHES=$(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v "^$SOURCE_BRANCH\$")

# === Checkout and update source branch ===
git checkout $SOURCE_BRANCH || exit 1
git pull origin $SOURCE_BRANCH || exit 1

# === Merge source into each target ===
for TARGET in $TARGET_BRANCHES; do
  echo "Merging '$SOURCE_BRANCH' into '$TARGET'..."
  if $DRY_RUN; then
    echo "[Dry Run] Would run: git checkout $TARGET"
    echo "[Dry Run] Would run: git pull origin $TARGET"
    echo "[Dry Run] Would run: git merge $SOURCE_BRANCH -m \"Merge $SOURCE_BRANCH into $TARGET\""
    echo "[Dry Run] Would run: git push origin $TARGET"
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