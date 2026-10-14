# 0.9.1 SDK patch verification

2026-10-14, Linux candidate. GameKit v0.3.1 dist `72b09b260edf9650353017acb49c06873fe9f5a1`, source `baa96876876a08013ad28b5a71c83bfadd285fab`. The six imported modules were SHA-256 checked against the official distribution manifest; hashes are recorded in [gamekit-manifest.json](gamekit-manifest.json) and emitted in build.json.

- PASS: `npm run build`, JavaScript module syntax, runtime/manifest distribution-pin consistency, deployment HTML generation.
- ENVIRONMENT BLOCKED: existing `tests/scenario.cjs` with real `/usr/bin/chromium`, using a temporary runner to select that executable. Both normal and escalated attempts terminated before browser startup with `process_singleton_posix.cc: socket() failed: Operation not permitted` (SIGABRT). Neither attempt reached dependency loading or gameplay. Each finished well within 180 seconds.
- No mocks, replacement network, alternate physics or fabricated PASS results. No GPU renderer or real Matter/Nostr/WebRTC result was obtained in this run. Full details: [current patch report](sdk-0.3.1-report.json).
- The product display/package version is 0.9.1. The existing welcome value `0.9.0` and namespace `bloom-yarn-mayhem-v090` are retained because no game wire payload or contract changed. This preserves the intended 0.9.x room contract without adding a compatibility adapter; mixed-version live interoperability remains unverified.
- Gameplay, 30TPS, host-authoritative ownership, presentation sampling and fixtures are unchanged. New netcode was not introduced.
- User-approved scope update (2026-10-14): ship this compatible SDK patch using static code/build verification only; live browser checks are deferred for later user review. Historical results below describe 0.9.0 and must not be treated as a passing 0.9.1 run. Deployment byte verification is separate from gameplay validation.

---

# 0.9.0 migration verification

Source: YARNFALL 0.8.3, SHA-256 `2f1ae7673df01d9e43803147f6d0e4f2cf6f8c3a4eba385726287ccc6f8e57bf`. Original Git bytes match; Windows checkout initially used CRLF, now `.gitattributes` fixes LF. No gameplay-rule rewrite.

## Actual execution

2026-10-14, Microsoft Edge 155.0.4283.45, Windows, NVIDIA GeForce GTX 1660 Ti / ANGLE Direct3D11 WebGL. Real Matter.js 0.20.0 and pinned GameKit CDN modules. No mocked engine, signaling or transport. Two isolated browser contexts on the same PC, public Nostr signaling and real WebRTC data channels.

- Original 0.8.3: 11 checks passed, no runtime exceptions or failed requests. Movement, held attack, solo death/restart, two-peer admission/input roundtrip, HP0 spectator, five-second revive, team wipe.
- 0.9.0: 14 checks passed, no runtime exceptions or failed requests. Above flows plus real Matter contact merge, split/XP progression and stat investment.
- Damage/merge scenes use the original explicitly gated QA fixtures. Engine stepping, combat rules, SDK loop, signaling, RTC and rendering are real. This does not claim every scene was reached through unaided manual play.
- Original revive protection is 1500ms. The test initially tried to damage a just-revived protected actor; the fixture was corrected to wait for that existing protection. Game protection was not changed.
- The dash-state refactor briefly left one CONFIG reference pointing at the runtime shape; it was corrected before the passing final run.
- Four simultaneous peers, separate devices/NAT traversal, long sessions and physical mobile touch hardware remain unverified. Same-PC RTC success does not guarantee all internet routes.

## Refactoring decisions

- Single executable/source SSOT: `index.html`; original stays in Git history, not a second runtime file.
- GameKit v0.3.0 dist/tag `63c62dae8d339f6f0329c0940206806f69509630`, checked against the actual tag and manifest. No published GitHub Release object exists; the distribution tag is used.
- The existing host-authoritative model is retained. Solo and host use the same `stepWorld`; joining peers send input and consume snapshots. Fake one-byte input allocation is replaced with the real loop input packet. No legacy compatibility bundle or alternate simulation was added.
- Player HAS-A Matter body and run stats; dash state belongs to the player under `dash`. Pure-data actors remain data records: no unused class hierarchy or capability registry.
- `BodyPose` and `ShotPose` ARE render schema types extending GameKit `RenderObject`. `PresentationRuntime` owns detached sampled coordinates; camera, silhouettes, shadows and projectile positions read them. Canonical Matter positions are never replaced with presentation positions. Run/stage/role changes reset the presentation revision; death/revive changes generation, and large position changes snap.
- Interpolation is visual only. Local attack/physics prediction would require a separate consistent physics fork; introducing it would change gameplay architecture. No fabricated preview or rollback compatibility path is claimed.
- Existing authority event IDs prevent repeated network one-shot VFX. World reset clears effects; pagehide releases room, input, loop, audio, renderer and Matter overrides. Existing local/remote effect styles are preserved.
- Unused pools, fire timer, pending-level counter, redundant dash timestamp and frame counter removed. 30TPS, attacks, stage generation, growth values and revival timings preserved.
- Version 0.9.0 reflects the new SDK transport contract and isolated room namespace, not the internal cleanup alone. 0.8.3 rooms are incompatible.

CI validates module syntax and prepares the single HTML artifact with commit/content hash. Live engine/RTC checks are the documented local scenario, not an inferred CI result. Public deployment is verified after merge against `build.json` and the HTML bytes.

Mobile viewport check: 390x844, start, tree open/close, pause/resume and reload passed; no horizontal page overflow. This is browser emulation, not a physical mobile device.

## 0.9.2 stat-tree visibility patch

Base: `efe9e240c44546f12330e4e982e028feca423cd7` (0.9.1). The tree was below the full-screen menu/clear overlay (z-index 6 vs 7), and T was excluded during pause. The panel now sits above that overlay but below loading/error, with a shared menu/HUD/T open-close path and focus restoration. Gameplay, stat costs/effects and GameKit/network pins are unchanged.

- PASS: `npm run build` (module syntax, fixed dependency provenance, single-HTML artifact) and `git diff --check`.
- PASS: temporary Node DOM-stub checks executed the actual UI functions for menu/play/pause/clear/dead, repeated button/T open-close, focus/ARIA, input/modifier guards and existing stat-action routing. Static layer ordering was checked. Temporary checks were not retained; these are not browser/game E2E.
- Environment blocked: the dot cloud browser loading deployed 0.9.1 stopped before game boot with `WebGL 1 is required; no Canvas2D fallback`. Its computed DOM styles confirmed the old 6/7/9 tree/modal/loader ordering and missing menu entry. No renderer fallback was added. Local browser execution remained unavailable under the existing socket restriction and was not retried.
- Not verified in this patch: actual GPU/gameplay/RTC, visual layout and physical touch input. Earlier 0.9.0 results above do not count as 0.9.2 runtime validation.
