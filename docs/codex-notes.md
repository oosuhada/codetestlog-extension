# Codex Notes

## Instructions For Future Codex Sessions
- Start every session by checking `pwd`, `git branch --show-current`, `git status --short --branch`, and `git remote -v`.
- If the tree is clean, run `git pull --rebase` before continuing work on an existing branch.
- Read `docs/current-work.md`, `docs/codex-notes.md`, and `docs/implementation-notes.md` before making changes.
- For phase work, read `docs/tasks/CODEX_TASKS.md`, then the exact prompt under `docs/tasks/prompts/`, then the previous phase log under `docs/tasks/logs/`.
- Inspect relevant source files before editing. Do not infer behavior only from filenames.
- Keep user secrets out of code, docs, logs, commits, screenshots, and PR bodies.

## Project Conventions
- Algolog is a Chrome Manifest V3 extension with no server.
- Runtime settings use the `ctl_` storage-key namespace.
- Core commit behavior should flow through shared logic in `scripts/core/` and existing site adapters where possible.
- Site-specific behavior belongs under the matching `scripts/{site}/` directory.
- Side Panel feedback should stay concrete and action-oriented.
- Optional integrations such as Notion and AI feedback must not block the core GitHub commit flow.
- Dashboard code is static under `dashboard/` and is deployed separately through GitHub Pages workflow config.

## Things Codex Should Avoid Changing
- Do not hardcode GitHub, Notion, AI provider, or private repository credentials.
- Do not make unrelated production code changes while updating handoff docs.
- Do not rename storage keys, commit path rules, or commit message formats without a migration plan.
- Do not replace phase docs or logs when a small append or targeted update is enough.
- Do not add production dependencies unless the repo gains a clear package manager workflow and the change is necessary.
- Do not assume local Codex cache or machine-local logs are available on another device.

## Known Gotchas
- Phase prompts are in `docs/tasks/prompts/`.
- Existing phase logs are in `docs/tasks/logs/`.
- There is no visible `package.json`, lockfile, or npm script workflow at the time this file was created.
- Extension validation often needs Chrome manual testing because content scripts depend on target coding-site DOMs.
- `manifest.json` references optional external services, but actual user keys should remain runtime settings.
- Remote origin currently points to `https://github.com/oosuhada/code-test-log.git`.

## Environment Assumptions
- Primary development is on macOS.
- Browser runtime is Chrome with Manifest V3 support.
- GitHub is the shared handoff layer across MacBook Pro, MacBook Air, Codex Cloud, and server-side automation.
- Dashboard can be checked by opening `dashboard/index.html` directly.
- Unknown: whether all target coding sites are available for live manual validation on every machine.

## Git / PR Workflow Notes
- Use short, descriptive branches such as `docs/codex-handoff-workflow`.
- Keep production feature work and docs-only handoff updates separate when possible.
- Commit only relevant files; leave unrelated local changes untouched.
- Push branches to `origin` when credentials are available.
- Prefer a Draft PR for non-trivial work so another machine or Codex Cloud can resume from GitHub.
- Draft PRs should include summary, files changed, validation run, remaining TODOs, and handoff notes.

## Safe Validation Commands
- `git status --short --branch`
- `git diff -- docs/current-work.md docs/codex-notes.md docs/implementation-notes.md`
- `python3 -m json.tool manifest.json >/tmp/algolog-manifest.json`
- `python3 -m json.tool rules.json >/tmp/algolog-rules.json`
- Manual Chrome extension load and smoke test after production code changes.
