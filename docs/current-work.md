# Algolog Current Work

## Project Name
Algolog

## Current Branch
`docs/codex-handoff-workflow`

## Current Goal
Set up repository-based handoff notes so work can move between MacBook Pro, MacBook Air, and Codex Cloud without relying on local Codex cache or machine-specific logs.

## Current Status
- This is a docs-only handoff setup.
- No production extension code has been changed for this pass.
- The repository is a Chrome Manifest V3 extension with a static GitHub Pages dashboard.
- The project currently has no visible `package.json` or lockfile, so validation is mostly static/manual unless a future workflow adds scripts.

## Relevant Files / Areas
- `manifest.json`: Chrome extension manifest, permissions, content scripts, side panel, and background service worker wiring.
- `popup.html`, `popup.js`, `css/popup.css`: extension popup and settings surface.
- `sidepanel/`: Side Panel UI for action feedback, recent activity, and optional AI analysis display.
- `scripts/core/`: shared commit, site adapter, Notion, and AI client logic.
- `scripts/*/`: site-specific adapters and parsing/upload logic for coding-test platforms.
- `dashboard/`: static dashboard for public GitHub solution repositories.
- `.github/workflows/deploy-dashboard.yml`: dashboard deployment workflow.
- `docs/tasks/`: phase plan, prompts, and phase logs.

## Local Setup Notes
- Load the repository as an unpacked Chrome extension through `chrome://extensions`.
- Open `dashboard/index.html` directly in a browser for local dashboard checks.
- User-entered GitHub, Notion, and AI provider keys are runtime extension settings and must not be committed.
- Phase prompts live under `docs/tasks/prompts/`, not directly under `docs/tasks/`.

## Validation Commands
- `python3 -m json.tool manifest.json >/tmp/algolog-manifest.json`
- `python3 -m json.tool rules.json >/tmp/algolog-rules.json`
- `find . -maxdepth 3 \( -name node_modules -o -name .next -o -name dist -o -name build -o -name .git \) -prune -o -print | sort | head -200`
- Manual: load the unpacked extension in Chrome and verify popup, side panel, and target-site injection behavior.
- Manual: open `dashboard/index.html` and test a public `username/repo` input.

## Known Issues
- TODO: No automated lint/build/test command is currently discoverable because there is no visible package manager config.
- TODO: Chrome extension runtime behavior still needs manual browser validation after production code changes.
- TODO: Confirm whether the remote repository name should stay `code-test-log` while the product name is Algolog.

## Next Steps
- Use this branch and PR as the shared handoff hub for docs-only workflow setup.
- For feature work, start from the matching `docs/tasks/prompts/P0X_*.md` file and read the previous phase log first.
- Keep future handoff updates concise and append dated sections when preserving history matters.

## Machine Handoff Checklist
- Run `git status --short --branch`.
- Confirm branch with `git branch --show-current`.
- Pull safely when the tree is clean: `git pull --rebase`.
- Read `docs/current-work.md`, `docs/codex-notes.md`, and `docs/implementation-notes.md`.
- Check `docs/tasks/CODEX_TASKS.md` and the relevant phase prompt/log before editing feature code.
- Commit only relevant files.
- Push the current branch.
- Create or update a Draft PR when the work is non-trivial.
