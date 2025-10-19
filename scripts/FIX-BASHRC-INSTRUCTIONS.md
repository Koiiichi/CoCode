# Fix for GPG Passphrase Prompt on Every Terminal

## Problem
You're being prompted for your GPG passphrase every time you open a terminal because the setup script added a line to your `~/.bashrc` that runs globally.

## Solution
The token export now only runs when you're in the CoCode repository directory.

## Quick Fix (Manual Method)

1. **Open your .bashrc file:**
   ```bash
   nano ~/.bashrc
   # or
   code ~/.bashrc
   ```

2. **Find and REMOVE this line:**
   ```bash
   export GIT_SCRIPT_MASTER_TOKEN=$(~/.git-script-auth/get-token.sh)
   ```

3. **Add this block instead:**
   ```bash
   # CoCode Git Script Token - Only loads in CoCode repository
   if [[ "$PWD" == "/c/Users/Muneeb Hassan/CoCode"* ]]; then
     if [[ -z "$GIT_SCRIPT_MASTER_TOKEN" ]]; then
       export GIT_SCRIPT_MASTER_TOKEN=$(~/.git-script-auth/get-token.sh 2>/dev/null)
     fi
   fi
   ```

4. **Save and reload:**
   ```bash
   source ~/.bashrc
   ```

## Automated Fix

Run the fix script from the CoCode repository:
```bash
cd "/c/Users/Muneeb Hassan/CoCode"
bash scripts/fix-bashrc.sh
```

## Result
- ✓ No more passphrase prompts when opening terminals outside CoCode
- ✓ Passphrase only requested when you `cd` into the CoCode directory
- ✓ Scripts still work as expected within the CoCode repository

## Verification
1. Open a new terminal somewhere else → No prompt
2. `cd "/c/Users/Muneeb Hassan/CoCode"` → Prompt appears (only once)
3. Scripts in `/scripts` work normally
