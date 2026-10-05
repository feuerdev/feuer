# feuer: persistent MMORTS with guided onboarding

Status: proposed implementation spec, 5 October 2026. Target source is `dev`, inspected at `562aa54e49092fc01f879f85d4aa1240c94999f6`; master is an older sprite/Firebase presentation. Cleanup and this plan target dev and do not reconcile or publish the branches.

## Existing system and cleanup

Npm workspaces for client/server/shared, React/Vite/Pixi graphics, Zustand state, Socket.io, shared hex/pathfinding/game types, Clerk identity and optional PostgreSQL JSON world snapshots. Dev includes resource generation, unit hiring/assignment, building upgrades, relations and battles. TODO checkboxes show author intent, not verified product behavior. No automated game regression suite is present.

Cleanup makes the root build sequential, documents workspace names/config and branch differences, ignores generated output/local environment files, and replaces the Tailwind plugin require with an ESM import so existing lint passes. It avoids game-rule changes, provider migration and running an exposed dev server. Workspace commands now use explicit package names (`client` and `@feuer/server`). Build failures found by verification remain explicit triage items.

## Product direction and first-player journey

Feuer remains an MMORTS with a persistent shared multiplayer world. The ten-minute target describes a new player's first ten minutes, not a match duration or the end of the game. Establish a settlement, gather resources, construct a building, recruit and move a unit, then complete a small objective or encounter before continuing into the wider world.

Guided solo onboarding uses the same simulation rules and validated commands as multiplayer. A protected starter area versus a private tutorial instance remains an explicit product decision. A seeded resettable scenario supports development, demonstrations and regression checks; it does not replace persistent progression or the shared world.

First prove stable identity, server authority, valid commands, reconnect and persistence in a reliable small multiplayer world. Broader MMO mechanics build on that foundation. Guilds, trading, ranked matchmaking, monetization and large population scaling are deferred, not substituted for the MMORTS direction.

## Product flow

Prototype landing → authenticated player joins or resumes their settlement → controls/help and onboarding progress → gather resources → construct a building → recruit/move a unit → complete a bounded onboarding objective → continue in the persistent world. Development fixtures can reset; production progression must survive restart. Exact constants remain existing shared rules until playtesting justifies change.

## Technical specification

| Area | Required behavior and design | Acceptance |
| --- | --- | --- |
| World lifecycle | Add stable world ID/seed/version and explicit startup/load/shutdown; optional isolated tutorial world uses identical rules; development reset destroys timers/sockets/state | Restart preserves shared progression; isolated development worlds do not share entities; reset cannot erase production progression |
| Authority | Validate every socket command's type, ranges, resource cost, ownership and current phase server-side | Forged unit ID, impossible move, negative amount and malformed payload denied without state mutation |
| Identity/debug | Explicit demo identity only in local/isolated demo mode; production requires verified identity; debug routes disabled server-side outside development | Production tests cannot authenticate with arbitrary username or invoke debug mutation |
| State/reconnect | Stable entity IDs, world version and command sequence; reconnect sends an authoritative snapshot and rejects stale commands | Disconnect/reconnect restores one player once, no duplicate entities or free repeated purchases |
| Persistence | Required for the multiplayer milestone; serialize save operations and rebuild/validate IDs on load | Snapshot reload preserves owners, resources and ID uniqueness; corrupted snapshot gives controlled failure |
| Presentation | Readable HUD, selection/action feedback, objective progress, keyboard controls and help | Five fresh testers can identify next action; contrast/focus checked; narrow-screen limitations stated honestly |
| Performance | Bound map/entity count and socket updates; pause hidden-client rendering; measure two-player baseline | Target 60 fps desktop at a stated resolution/device; p95 command feedback <250 ms at a stated network RTT; record misses |
| Operations | Separate origin/bind configuration, safe config logging, bounded sessions, health endpoint and orderly shutdown | No secrets logged; all local previews bind to 127.0.0.1; shutdown clears timers and completes/cancels save |

Extract deterministic simulation steps from process startup/config imports. Tests should run fixtures without creating real sockets, Clerk calls or a DB. A world controller owns simulation/timers; a socket adapter maps validated commands to it. Client renders authoritative snapshots plus optional nonauthoritative selection state. A deterministic in-memory fixture is useful for tests; restart persistence is required for the shared-world milestone, with a deliberate storage implementation and recovery test.

The server defaults to an explicit loopback HTTP bind (`FEUER_HOST=127.0.0.1`). This task does not start a game service on the VPS. README's historical demo URLs are not verification of live deployments.

## Ordered work packages

1. **F1 — build/contract baseline (2–3 days).** Resolve any baseline build/lint failures with focused fixes; record Node/dependency compatibility; verify server build without starting it. Add command schemas and deterministic simulation tests. Acceptance: fresh install + sequential builds + core fixtures pass.
2. **F2 — first-player scenario (3–5 days).** Implement persistent world lifecycle and isolated development reset, tutorial objective, guided settlement/resource/build/recruit/move objective using shared multiplayer commands. Test resource costs, movement/pathfinding, assignment and objective completion. Acceptance: complete the first-player journey twice from a development reset and continue into the world without manual admin intervention.
3. **F3 — reliability/playtesting (2–4 days).** Add reconnect tests, invalid-command cases, stable load IDs and restart persistence, bounded timers and debug restrictions. Run five playtests with no coaching after initial instructions. Acceptance: at least four finish the objective and zero cross-player authority failures.
4. **F4 — portfolio evidence (1–3 days).** Record actual gameplay, small architecture diagram, timings/device details and a concise evolution/tradeoff case study. Replace polished screenshots only when they match the selected demo. Publish a demo only after explicit authorization.

Total: roughly 8–15 focused days after scope freeze, subject to baseline failures. Build system is checked sequentially on this VPS; multiplayer/browser playtests need a suitable environment and no concurrent expensive operations.

## Portfolio/revenue decision

Portfolio-ready means a reproducible local demo, one complete onboarding journey and persistent shared-world restart, server authority tests, reset/reconnect evidence, recorded performance and honest prototype limits. Make a two-minute walkthrough available if a live server is expensive to maintain.

A side gig is premature. Only consider an expanded game if at least 10 external testers try it, five return voluntarily within a week and three ask for more play time/features. Gather session completion/return metrics with consent and no new analytics dependency by default. Failure of those gates leaves a finished portfolio game with bounded evidence for its persistent MMORTS roadmap.

## Validation and rollout

Compile server and client separately; run pure simulation tests before any browser test. Live validation should cover two identities, malicious commands, tab hiding, reconnect, isolated development reset and full objective. Repo instructions discourage testing through the dev command; use a deliberate isolated verification setup and request a human playtest only when a concrete build exists. No merge or production deployment in this task. Roll back a demo release by reverting the last change and loading only a compatible world version; database schema/version changes need migration/backup design first.

## Configuration logging cleanup

The unconditional startup dump of the complete config object was removed because that object includes the Clerk secret and database connection string. Configuration parsing and game behavior are unchanged; named operational messages remain. Server compilation is the relevant check; no server, sockets, database or provider was started.

## Draft implementation receipt

Six authority/persistence regressions were reproduced before repair: loaded ID allocation, shared template slots, malformed commands, invalid resource balances, undiscovered tiles and stale disconnected authority. Seven initial cases pass after repair. Added positive client hiring/signed transfer, socket replacement, deterministic generation, battle rehydration, real-file snapshot/save-order and recoverable-save-error checks. Scoped server compilation and the expanded suite must pass on the final PR head; isolated PostgreSQL CI verifies real snapshot persistence separately.

This phase implements common multiplayer foundations, not a completed first-ten-minutes tutorial. Protected starter area versus private tutorial instance remains open. Persistent database errors fail startup instead of generating a replacement world. Graceful saves are serialized; abrupt-crash durability, schema/version migration, command replay/sequence, rate limits, complete corruption validation and live multiplayer/browser evidence remain open. No merge/deploy.
