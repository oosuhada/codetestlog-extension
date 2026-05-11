# Implementation Notes

## Architecture Overview
- Algolog is a serverless Chrome extension that records coding-test submissions into a GitHub repository.
- `manifest.json` defines the Manifest V3 extension entry points, host permissions, content scripts, background service worker, side panel, and web-accessible resources.
- `scripts/core/` contains shared extension logic such as commit handling, site adapter structure, Notion integration, and AI feedback client behavior.
- `scripts/{site}/` directories contain site-specific parsing, state, upload, and adapter code for platforms such as Baekjoon, Programmers, SWEA, LeetCode, and goormlevel.
- `popup.html`, `popup.js`, and `css/popup.css` provide extension settings and optional feature controls.
- `sidepanel/` provides action feedback and recent activity visibility while the user works through submissions.
- `dashboard/` is a static dashboard for visualizing a public GitHub solution repository.
- `.github/workflows/deploy-dashboard.yml` manages GitHub Pages dashboard deployment.

## Important Implementation Decisions
- The project is designed without a backend server.
- GitHub commit behavior is the core reliability path; optional integrations should stay non-blocking.
- Storage keys use the `ctl_` namespace and should remain stable across machines and extension sessions.
- The extension records all submission attempts, not only accepted submissions.
- Site integrations should reuse shared adapter and commit-handler contracts rather than duplicating commit flow.
- AI feedback supports user-provided provider keys and must remain optional.
- Documentation work should preserve the phase-driven workflow under `docs/tasks/`.

## Tradeoffs
- A serverless extension keeps setup lightweight, but runtime behavior depends heavily on Chrome APIs and target-site DOM stability.
- Static dashboard deployment is simple, but it depends on public GitHub repository data and browser-side fetching.
- User-managed API keys avoid central infrastructure, but require careful handling to avoid accidental exposure.
- Manual browser validation is still important because there is no discoverable automated extension test harness.

## Follow-Up Ideas
- TODO: Add a lightweight documented validation checklist for popup, side panel, commit flow, and dashboard.
- TODO: Consider adding a package/script workflow only if the project adopts automated linting or formatting.
- TODO: Document a repeatable Chrome extension smoke-test matrix for each supported coding site.
- TODO: Add PR templates or issue templates for phase-based work if the current GitHub templates are not enough.
- TODO: Confirm dashboard deployment expectations for the renamed Algolog product versus the `code-test-log` remote.

## Areas That Need Careful Manual Review
- `manifest.json` permission changes and content script matches.
- GitHub token handling and any OAuth/PAT-related UI or storage changes.
- Commit path and commit message generation.
- Result normalization for wrong, timeout, runtime error, compile error, memory exceeded, partial, and correct outcomes.
- Site DOM parsing changes, especially after target platform UI updates.
- Optional Notion and AI feedback flows, especially failure handling.
- Dashboard parsing of repository paths and result/status categories.
