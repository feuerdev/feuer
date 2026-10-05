# feuer: ten-minute multiplayer portfolio demo

Status: proposed implementation spec, 5 October 2026. Target source is `dev`, inspected at `562aa54e49092fc01f879f85d4aa1240c94999f6`; master is an older sprite/Firebase presentation. Cleanup and this plan target dev and do not reconcile or publish the branches.

## Existing system and cleanup

Npm workspaces for client/server/shared, React/Vite/Pixi graphics, Zustand state, Socket.io, shared hex/pathfinding/game types, Clerk identity and optional PostgreSQL JSON world snapshots. Dev includes resource generation, unit hiring/assignment, building upgrades, relations and battles. TODO checkboxes show author intent, not verified product behavior. No automated game regression suite is present.

Cleanup makes the root build sequential, documents workspace names/config and branch differences, ignores generated output/local environment files, and replaces the Tailwind plugin require with an ESM import so existing lint passes. It avoids game-rule changes, provider migration and running an exposed dev server. Workspace commands now use explicit package names (`client` and `@feuer/server`). Build failures found by verification remain explicit triage items.

## User and demo contract

A recruiter/developer should understand the game in under a minute and see server-authoritative realtime behavior in a ten-minute match. A hobby player should be able to enter one seeded scenario, gather resources, construct/upgrade, hire/move a unit and reach one clear objective.

Scope: one map seed, one tutorial objective, one human plus a scripted opponent or a second human, approximately ten minutes, deterministic reset. Non-goals: persistent public MMO, guilds/trading, ranked matchmaking, monetization, elaborate injuries, new engine or provider rewrites.

## Product flow

Landing states the prototype status → choose solo guided demo or invite-only two-player match → short controls/help → gather enough wood/stone → build and assign a unit → move through terrain → win by controlling a specified tile for a set time → result explains actions/time and offers reset. Exact balance constants live in shared rules and are playtested; no new rules are accepted merely because they were on TODO.md.

## Technical specification

| Area | Required behavior and design | Acceptance |
| --- | --- | --- |
| Match lifecycle | Add match ID/seed/version and a lifecycle `waiting → running → finished`; isolate world per match; reset destroys timers/sockets/state | Reset repeats seed/objective and leaves no old match updates; two matches never share entities |
| Authority | Validate every socket command's type, ranges, resource cost, ownership and current phase server-side | Forged unit ID, impossible move, negative amount and malformed payload denied without state mutation |
| Identity/debug | Explicit demo identity only in local/isolated demo mode; production requires verified identity; debug routes disabled server-side outside development | Production tests cannot authenticate with arbitrary username or invoke debug mutation |
| State/reconnect | Stable entity IDs, world version and command sequence; reconnect sends an authoritative snapshot and rejects stale commands | Disconnect/reconnect restores one player once, no duplicate entities or free repeated purchases |
| Persistence | Optional for portfolio MVP; if enabled, serialize save operations and rebuild/validate IDs on load | Snapshot reload preserves owners, resources and ID uniqueness; corrupted snapshot gives controlled failure |
| Presentation | Readable HUD, selection/action feedback, objective progress, keyboard controls and help | Five fresh testers can identify next action; contrast/focus checked; narrow-screen limitations stated honestly |
| Performance | Bound map/entity count and socket updates; pause hidden-client rendering; measure two-player baseline | Target 60 fps desktop at a stated resolution/device; p95 command feedback <250 ms at a stated network RTT; record misses |
| Operations | Separate origin/bind configuration, safe config logging, bounded sessions, health endpoint and orderly shutdown | No secrets logged; all local previews bind to 127.0.0.1; shutdown clears timers and completes/cancels save |

Extract deterministic simulation steps from process startup/config imports. Tests should run fixtures without creating real sockets, Clerk calls or a DB. A match controller owns simulation/timers; a socket adapter maps validated commands to it. Client renders authoritative snapshots plus optional nonauthoritative selection state. Keep PostgreSQL optional until restart persistence becomes part of the promised demo.

The current `new Server(port)` has no explicit loopback bind. Do not start it on this shared VPS until a host-binding change is implemented and checked. README's historical demo URLs are not verification of live deployments.

## Ordered work packages

1. **F1 — build/contract baseline (2–3 days).** Resolve any baseline build/lint failures with focused fixes; record Node/dependency compatibility; verify server build without starting it. Add command schemas and deterministic simulation tests. Acceptance: fresh install + sequential builds + core fixtures pass.
2. **F2 — bounded scenario (3–5 days).** Implement match lifecycle/reset, tutorial objective, basic scripted opponent or invitation path and outcome. Test resource costs, movement/pathfinding, assignment and victory. Acceptance: complete one match twice from reset without manual admin intervention.
3. **F3 — reliability/playtesting (2–4 days).** Add reconnect tests, invalid-command cases, stable load IDs if persistence enabled, bounded timers and debug restrictions. Run five playtests with no coaching after initial instructions. Acceptance: at least four finish the objective and zero cross-player authority failures.
4. **F4 — portfolio evidence (1–3 days).** Record actual gameplay, small architecture diagram, timings/device details and a concise evolution/tradeoff case study. Replace polished screenshots only when they match the selected demo. Publish a demo only after explicit authorization.

Total: roughly 8–15 focused days after scope freeze, subject to baseline failures. Build system is checked sequentially on this VPS; multiplayer/browser playtests need a suitable environment and no concurrent expensive operations.

## Portfolio/revenue decision

Portfolio-ready means a reproducible local demo, one complete match, server authority tests, reset/reconnect evidence, recorded performance and honest prototype limits. Make a two-minute walkthrough available if a live server is expensive to maintain.

A side gig is premature. Only consider an expanded game if at least 10 external testers try it, five return voluntarily within a week and three ask for more play time/features. Gather session completion/return metrics with consent and no new analytics dependency by default. Failure of those gates leaves a finished portfolio game rather than an open-ended MMO roadmap.

## Validation and rollout

Compile server and client separately; run pure simulation tests before any browser test. Live validation should cover two identities, malicious commands, tab hiding, reconnect, match reset and full objective. Repo instructions discourage testing through the dev command; use a deliberate isolated verification setup and request a human playtest only when a concrete build exists. No merge or production deployment in this task. Roll back a demo release by reverting the last change and loading only a compatible match/world version; database schema/version changes need migration/backup design first.
