#!/bin/bash

AUTHORIZED_USER="Muneeb Hassan"
CURRENT_USER=$(git config user.name)

if [ "$CURRENT_USER" != "$AUTHORIZED_USER" ]; then
  echo "Unauthorized: Only $AUTHORIZED_USER is allowed to run this script."
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: $0 <source-branch>"
  exit 1
fi

SOURCE_BRANCH="$1"
ALL_TARGETS=("feature/auth-frontend" "feature/auth-backend" "feature/code-management" "main")

# Filter target branches to exclude the source branch
TARGET_BRANCHES=()
for BRANCH in "${ALL_TARGETS[@]}"; do
  if [ "$BRANCH" != "$SOURCE_BRANCH" ]; then
    TARGET_BRANCHES+=("$BRANCH")
  fi
done

# Ensure source branch exists
git show-ref --verify --quiet refs/heads/$SOURCE_BRANCH
if [ $? -ne 0 ]; then
  echo "Source branch '$SOURCE_BRANCH' does not exist."
  exit 1
fi

git checkout $SOURCE_BRANCH || exit 1
git pull origin $SOURCE_BRANCH || exit 1

for TARGET in "${TARGET_BRANCHES[@]}"; do
  echo "Merging '$SOURCE_BRANCH' into '$TARGET'..."
  git checkout $TARGET || exit 1
  git pull origin $TARGET || exit 1
  git merge $SOURCE_BRANCH -m "Merge $SOURCE_BRANCH into $TARGET"
  if [ $? -ne 0 ]; then
    echo "Merge conflict occurred in branch '$TARGET'. Resolve manually."
    exit 1
  fi
  git push origin $TARGET || exit 1
done

git checkout $SOURCE_BRANCH