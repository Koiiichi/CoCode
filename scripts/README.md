# Internal Git Tooling & Scripts

This README documents the internal git automation scripts and GitHub workflows used in the **CoCode** project. These tools help manage branch operations securely and streamline team workflows while ensuring safe and intentional Git history modifications.

---

## Secure Authorization Layer

All scripts include a local authorization mechanism:

- **Token-based Auth**: You must export `GIT_SCRIPT_MASTER_TOKEN` in your environment.
- **Trusted Mode**: Once authenticated, you can run `grant-trust.sh` to skip prompts until revoked.
- **Encrypted Storage**: Token is stored securely in `~/.git-script-auth` and decrypted on demand via `setup.token.sh`.

**Token Setup**:
```bash
./setup-token.sh  # Only authorized users can run this
```

**Note**: The token is automatically loaded only when you're in the CoCode repository directory. This prevents the GPG passphrase prompt from appearing in every terminal session globally.

**Fix Existing Installation**:
If you previously ran `setup-token.sh` and are getting passphrase prompts globally, run:
```bash
./fix-bashrc.sh  # Removes global export and adds repo-specific check
```

---

## Git Automation Scripts

### `merge-to-all.sh`
- Merges a **source branch** into all other branches, skipping those ahead or diverged.
- Supports:
  - `-c` / `--current` (use current branch)
  - `--dry-run` (simulation)
  - `--exclude <branches>`

**Example:**
```bash
./merge-to-all.sh -c --dry-run --exclude main dev
```

### `realign-branches.sh`
- Resets or fast-forwards multiple branches with optional remote push.
- Skips protected branches unless `--include-protected` is specified.

Supports:
- `--reverse <n>`
- `--forward <n> --base <branch>`
- `--include-protected`
- `--update-remote`
- `--log logfile.txt`

**Example:**
```bash
./realign-branches.sh --forward 3 --base dev --exclude main --dry-run
```

### `grant-trust.sh`
- Locally creates `.internal/authorized.flag` allowing scripts to run without repeated token prompts.
- **Only executable by authorized users** (chmod restricted).

### `revoke-trust.sh`
- Deletes the trust flag. Scripts will prompt for token again.

---

## GitHub Workflows

### `Post Commit Messages to Discord`
- Sends formatted commit summaries to a Discord webhook on `main` and `features/**` pushes.
- Includes:
  - Branch name
  - Author
  - Commit message(s)
  - File change stats (first 10 lines)

### `Git Branch Graph & Status`
- On every push, it posts a branch summary to Discord.
- Shows each branch’s:
  - HEAD status
  - SHA hash
  - Ahead/behind compared to `main`

---

## Directory Overview
```
/scripts
  merge-to-all.sh
  realign-branches.sh
  grant-trust.sh
  revoke-trust.sh
  setup.token.sh
  /.internal
    authorize.sh
    authorized.flag (generated)
    get-token.sh
```

---

## Access Control Summary
| Script              | Auth Required | Only authorized user? | Notes                           |
|---------------------|---------------|-----------------------|---------------------------------|
| setup.token.sh      | Yes           | Yes                   | Stores and encrypts token       |
| authorize.sh        | Runtime       | No                    | Validates token when needed     |
| grant-trust.sh      | Yes           | Yes                   | Enables trusted flag locally    |
| revoke-trust.sh     | No            | No                    | Clears trust flag               |
| merge-to-all.sh     | Yes           | No                    | Merges branches (safe rules)    |
| realign-branches.sh | Yes           | No                    | Force reset/FF with warnings    |

---

## Setup Checklist
1. Run `setup.token.sh` to configure your personal token.
2. Use `export GIT_SCRIPT_MASTER_TOKEN=$(~/.git-script-auth/get-token.sh)` in `.bashrc`.
3. Use `grant-trust.sh` to enable trusted script usage (optional).
4. Use `revoke-trust.sh` to disable auto-authorization.
5. Scripts will now run securely and respect access.
