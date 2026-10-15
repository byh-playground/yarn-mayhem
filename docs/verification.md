# 0.16.1 mobile viewport flows without unnecessary scrolling

Base: PR13 merge020861ff5b35a3b09d7f957852354ec6fa559e90 / deployed0.16.0. Additional user request1792025501.302979. UI-only compatible patch; progression, simulation and0.16.0/v0160 room contract stay unchanged. Other projects and C:/projects user changes are preserved.

- Actual baseline844×390: multiplayer card client374px/content428px with footer buttons outside viewport; help client374px/content743px. Whole-page overflow:hidden did not make those controls usable. The fix restructures content instead: topic tabs for help; list→detail/back for mobile landscape stats; compact mode/room menus; connected-room code/copy/leave; result-first pause/clear/gameover with repeat instructions kept in help. Desktop stats retain two panes. All current help content and technology descriptions/requirements remain reachable.
- Native dynamic viewport height is bounded by100dvh so a stale visualViewport value cannot extend the app during a height decrease. visualViewport resize clears held input and synchronizes height. Safe-area variables default to native env insets. Controls reserve space for the movement hint. A tree-open portrait rotation keeps the higher rotation guide interactive and the tree inert.
- PASS: fixed mobile user-flow scenario199 assertions in installed Edge155.0.4283.45, touch844×390,667×320,568×280 and740×320 with explicit safe-area proxy top10/bottom14/left24/right24px. Main/mode/multiplayer, real connected host/leave, all four help topics, every technology in every branch, purchase, gameplay/native touch drag, pause/clear/gameover, expanded/contracted viewport and portrait over an open tree are checked. Panel and content extents, every visible button/input, and page scroll positions are measured; decorative hero glyphs and inline icon font extents are excluded from scroll-container checks. Terminal states use explicit QA completion/HP fixtures; inputs, rendering, Matter and actual room creation are real.
- PASS: existing21 actual-browser experience/real2-peer RTC checks after updating the mobile purchase path for list/detail navigation. No new transport, damage, save or simulation implementation. Prior0.16.0 pressure20 checks remain the unchanged-combat evidence; they were not rerun for this UI patch. Build/syntax/provenance and git whitespace checks are required before publishing.
- Test artifacts: test-results/mobile/report.json and representative short/safe-area detail, play, clear, gameover and portrait screenshots. Existing experience report remains test-results/experience/report.json. npm run test:mobile runs the permanent fixed flows; temporary observation/edit helpers are outside the repository and removed after recording.
- NOT VERIFIED: physical phone notch/OS keyboard/address-bar behavior, successful OS orientation locking, audible quality, four peers, long sessions or subjective pressure/fun. Safe-area proxy and actual viewport resizing are clearly distinguished from physical-device tests. No CSS document rotation or software renderer fallback.

---

# 0.16.0 needle-only growth, mobile landscape and committed enemy pressure

Base: main 8d7825a7f7be7697ce9e80d4bd4d8ef89b1cf333 (merged PR12 / 0.15.0). Original C:/projects checkout and other game projects remain untouched. No Actions or Pages configuration changes.

- Removed melee input, stats, combo execution, animation/audio, help and button. The first tree is actual needle power (+30%, 29→37.7), interval (−15%, 520→442ms), then split echo (300ms later, 25% of killing needle damage on each surviving child, no recursion). The only retired IDs are in the local-save import boundary: blade1→needlePower, bladeLaunch→needleTempo, bladeEcho→needleEcho. A visible notice explains conversion. Earned points and other investments are preserved; the canonical profile is written to the existing storage key. Runtime and wire validators accept only current IDs.
- Mobile uses native landscape geometry: compact HUD, left pad, right jump/dash/fire and side-by-side stats with a visible 44px purchase action. Portrait shows a rotation dialog. A user gesture requests supported fullscreen/orientation lock; unsupported environments show manual instructions. No CSS 90-degree transform. Resize, rotation, blur, visibility loss and pointer cancel clear inputs and captures. Guest cancellation sends a neutral command that clears authority edge flags. Solo portrait pauses; multiplayer continues while that client's controls are neutral.
- Nominal player speed 280/max-invested392px/s; enemy tiers560–632px/s, shared enemy dash1120px/s/220ms (player830px/s/190ms plus existing forward-velocity contribution). Alert720px; commitment at radius sum +30px, charge300ms→dash220ms→attack100ms→recovery220ms→wait140ms. Far same-tier fusion, low-health fusion intent, upper-tier projectiles and pin/ricochet remain. Committed charge/dash/attack cannot fuse. Ordinary touch, charge and recovery have no contact damage.
- Actual fixed flat-ground measurement in native Edge on both PC1280×844 and touch844×390: maximum-invested player390.432px/s, T1 chase486.600px/s (about25% faster). A natural two-T1 approach proceeded through charge/dash/attack/recover and damaged HP200→188; same-tier fusion can make a T2 before commitment. Collision dash peak727.320px/s reflects real momentum transfer. In a separate actual jump-arc dodge, free dash peaked1097.556px/s, HP stayed200, recovery was220ms. These are arranged physics observations, not guaranteed speed during every contact.
- PASS: 21 fixed experience checks: legacy-profile conversion preserving8 earned/2 free points and speed/recharge investments; actual needle purchase/effects; new game/reload; mobile native pad/jump/dash; portrait/manual rotation fallback; real Nostr/WebRTC admission; independent guest29 vs upgraded host37.7 damage; held remote fire cancellation on rotation and native pointer cancellation; match continuity; equal confirmed player/projectile arrays at the same tick; owned profile retained. Runtime errors0 and request failures0. Screenshots: test-results/experience/{landscape-stats,landscape-play,portrait-guide}.png.
- PASS: 20 fixed combat checks: chase vs maximum player, natural collision damage, jump miss/harmless recovery, far fusion, actual split echo child21→11.575HP (9.425 damage each), upper T6 projectile14 damage, surviving first-target underside and wall pins, 1200ms pin duration, three distinct upgraded37.7 needle contacts, no horizontal overflow. Native production Matter0.20.0 and GameKit remain real. Test fixture placement and stepped input/jump are explicit; damage is produced by actual simulation. Runtime and console errors0. Screenshots: test-results/pressure/{pc-arena,landscape-arena}.png.
- Native installed Microsoft Edge155.0.4283.45, Playwright msedge/headless through approved host execution; no CUA retries or software-renderer fallback. Fixed tests replace superseded user scenarios rather than adding numerical micro-tests or repeating the previous full suite. Each browser run is bounded to180s. Syntax/provenance build and whitespace check are also required before publishing.
- Room/welcome version0.16.0 / namespacev0160 because retired input/state slots and progression IDs changed. Player frames now18 fields; raw physical rotation and authority ownership remain. All participants must refresh. No legacy runtime branch or snapshot compatibility shim.
- NOT VERIFIED: physical mobile hardware, successful OS orientation locking on supported phones (desktop Edge showed the manual fallback), audible quality, four peers, long sessions and wider NAT/device conditions. Source fixtures do not establish subjective pressure or fun; that needs player feedback. No new transport/rollback architecture.

---

# 0.15.0 chain readability, melee-level needle damage and physical rolling

Base: main 0.14.0 / 9cf02ca463fa6211e84498305f7119f406129a53 (PR11 already merged). Original C:/projects checkout and other projects remain untouched.

- References: latest BLOOM development, visual-ux and project-management rules; actual [Bounko source 987e3e9](https://github.com/byh-playground/bloom-bounko/blob/987e3e92f6dee629f21f0e100fba21bb1715b088/index.html). Bounko playImpact, bloomImpact, confirmed combat events and bounded camera shake were inspected. Bounko-specific tuning was not adopted as a shared default.
- Damage history: git 40abcfa uses sword step specs 27/35/52, but performSlash scales them by owned attackPower=29 / first spec27. Actual first hit is29; full theoretical melee combo is122.4 over560ms. Needle changes5→29 at the unchanged520ms interval: single-target nominal9.6→55.8 DPS, at most three distinct actual hits per ricochet projectile. This matches per-hit base damage, not melee combo throughput. Saved owned progression is unchanged.
- Root causes: near T1 bodies heavily prefer fusion; charges may begin outside practical approach reach; contact damage used to open after the dash, so launch contacts could be harmless. A nearby two-T1 fixture gave no player damage in the baseline; an isolated T2 did execute its attack, so the old system was not entirely inactive. New normal engage range depends on physical radii and the shared dash distance, and launched contact belongs to the explicit attack window.
- Physical baseline/candidate measured in real Edge with production Matter0.20.0, same arranged flat-ground input: 0.5s walk131.83→132.59px, accumulated angle0→7.354rad versus expected distance/radius7.366rad. Candidate rim slip about0.08px/s and residual speed after133ms braking about0.32px/s. The player now has a finite-inertia radius18 circle; contact material changes from terrain friction.035 to shared rolling friction.45/static.8. Ground drive controls actual linear/angular velocity; airborne angular momentum and contact impulses remain Matter-owned. These are bounded fixture observations, not universal performance claims.
- Nearby two-T1 fixture player HP200→200 baseline,200→180 candidate. Isolated T2 fixture minimum HP188 baseline,176 candidate across110 fixed ticks. Natural AI and actual Matter contacts ran; no scripted damage result was injected. Existing shared dash charges, recharge and launch executor remain common to player/enemy controllers.
- Live Edge PC1280/touch390 chain observation: one real primary input, three distinct actual contacts with29 damage each, owned shooter ID retained, changing projectile positions between impacts, native AudioContext running and ricochet1/2/3 sound calls in the same order. In the measured representative run hit gaps were233/300ms. Audible quality is not verified. Early candidate hit-color overflow stopped the live renderer; channels were bounded and the same real chain flow passed afterward.
- Temporary determinism check: identical canonical input for90 ticks gives equal solo and host-role fixture frames even with extra cosmetic bursts; saved dashCapacity and needleCarry remain owned and saved. The host-role fixture is not a transport test. Actual Nostr/WebRTC is verified separately by the fixed browser scenario, including guest-owned29 damage, canonical rotation, admission, commands, progression and underside pin delivery.
- PASS: fixed actual-browser combat E2E50 checks, real Nostr/WebRTC E2E27 checks, temporary canonical/ownership/stat checks4. Native Edge155.0.4283.45, NVIDIA GTX1660Ti/D3D11 in the RTC run; runtime and final combat console errors0. Final runtime HTML SHA256 65f397d901e6c9b02f9b659d80be889762f72bb41812b033531a7664666824fb.
- Permanent tests remain the existing fixed user-flow E2E scenarios. Temporary numeric/differential probes and observation hooks are removed after recording results. Physics fixture placement is distinguished from ordinary input; real primary input, live chain timing and actual RTC remain real browser paths. No software renderer fallback is used by the recorded native NVIDIA browser run.
- NOT VERIFIED: physical mobile hardware, audible playback quality, four peers, long sessions and wider NAT/device conditions. No full replay/rollback redesign or other project changes.

---

# 0.14.0 primary needles, underside pins and shared enemy dash

Base: `40abcfa103ddff6765067a96955d6eb957c11c05` (0.13.1).

- Real Microsoft Edge 155.0.4283.45 through Playwright msedge, headless. PC 1280 and touch-enabled 390 browser viewport. No browser or simulation mock.
- PASS: 46 fixed combat checks and 26 existing browser/actual RTC checks; runtime/page errors 0 and combat console errors 0. Edge NVIDIA D3D11 renderer was observed in the existing RTC scenario.
- Fixed combat scenario covers immediate primary needle, upward underside pin at the existing 300px/s threshold, 1200ms release, preserved wall pin, low-speed/non-needle exclusion, ordinary one-way upward passage, charge target tracking/no damage, shared dash charge consumption, locked launch/dodge, harmless approach, explicit post-dash attack damage and recovery, T6 projectile and authoritative tell snapshot.
- Existing scenario additionally covers actual Nostr/WebRTC admission, host and guest owned progression, guest commands and guest primary needle, host underside pin received by guest, deaths/revive/team wipe, merge and split growth.
- Physics fixtures arrange bodies and bounded ticks through gated QA helpers, then execute production collision/control/motor paths. Pin fixtures use the production needle-hit handler. The owned needle tree is also purchased and exercised with actual needle projectiles through pin and recut/rebound. Primary input and RTC checks use real browser input and transport. This does not claim every arranged fixture is manual gameplay.
- NOT VERIFIED: physical mobile hardware, audible sound, four peers, long sessions, broader NAT/device conditions. Existing fixed GameKit distribution is unchanged.

---

# 0.13.1 through-body pinned needle candidate

Base: `834b31055c7f481c42f734d4ddeb0c1d3aa92072` (0.13.0). Previously the wall connector was drawn behind the opaque yarn while the foreground needle ended in the rear half of the body. The body itself touched the wall, leaving no exposed front shaft. Pinned drawing also retained launch direction even when the actual impact was a floor.

- Rear shaft, eye and thread are drawn before the body. The front shaft and two small puncture marks are drawn after the body; the hidden middle is never painted across the face. Both ends use one axis through the deformed visible body and the persisted actual contact point. The tip terminates at a terrain seam; no line continues beyond that face or floats with the actor.
- The authoritative pin pose moves at most 18px away from the collision normal to expose the front shaft. Placement checks other bodies and halves the gap when an overlap would deepen; a fully blocked placement keeps the original contact pose. The single Matter constraint owns this final position, which is replicated normally. No render-only world offset, projectile spawn, damage event or new gameplay needle is added.
- Existing outer collision walls are now drawn at their actual faces; camera bounds reveal 40px of wall at the map edge. No new collision geometry is created. When clearance is blocked and the anchor is inside the yarn outline, the front metal is skipped rather than reversed through the body.
- One-shot impulse, >=300px/s inward normal-speed requirement, 1.2s pin, rebound, cooldown and death cleanup are unchanged. Snapshot fields remain unchanged; pin and release presentation use the existing actor control lifecycle. Product patch 0.13.1 retains the 0.13.0 room/welcome and progression contract.
- PASS: seven temporary actual-Matter/renderer-call geometry checks: right/left/floor real contacts, exposed authoritative clearance, rear/front axis and exact tip endpoint, renderer non-mutation, snapshot positions/anchor/normal, release/death cleanup, reduced gap near an obstacle no relocation through occupied geometry, exact rendered boundary faces, and no reversed front metal when blocked. These are geometry assertions, NOT browser/GPU visual PASS.
- PASS: 33 existing actual-Matter combat checks plus two speed measurements; 13 progression checks; syntax/build and whitespace checks. Actual renderer primitives were additionally inspected as a temporary diagnostic illustration; this is not a gameplay screenshot.
- Actual Edge at `40819bd`: normal left/right walls, floor, body occlusion, wall-tip anchoring, 1.2s release and snapshot restoration passed on desktop and 390px viewport. Narrow adjacent-terrain stress revealed rear shaft/eye/thread penetrating neighboring terrain. Rear drawing is now clipped at the first terrain along its axis with width padding; physics and snapshot state are unchanged. Three focused actual-source rear-clipping checks passed for right/left/floor axes, including non-mutation of the complete snapshot. Build and whitespace checks passed. Targeted narrow-scene Edge retest is pending.
- Real two-peer RTC was not tested for this visual patch (snapshot roundtrip only). Physical mobile/audio quality remain unverified. No browser restriction bypass or new permanent diagnostic artifacts.

---

# 0.13.0 persistent owned progression verification

Base: `bf3e39133f94d11e2da4389bea6e1c06721d59b7` (0.12.0). `startNewRun()` unconditionally cleared every actor's investments and unspent points. Actor recreation also depended on a global local-stats alias and a revision cache that could skip restoring an unchanged revision onto a fresh actor.

- Actor-owned `progress` contains only cumulative `earnedPoints` and `upgrades`. Remaining points are derived from costs. `deriveTechStats` is the sole stat formula used by creation, purchase and snapshot restoration. The global stats alias, blanket reset and redundant revision cache are removed.
- New runs reset world/XP/combat and refill HP/dash, preserving each actor's progression. Stage changes and identity remapping preserve it too. Browser storage `yarn-mayhem.progress` contains only the local player's progression. No HP/world/other player's state is saved. Invalid storage is ignored with a notice; storage errors keep session state and show a warning.
- Admission hello carries the guest's personal progression, not final stats. Host validates known nodes, integer levels/maxima/prerequisites and spent <= earned before creating the actor. Duplicate hello cannot replace an admitted actor's authoritative progress. Pending roster peers do not become blank actors during a host restart. Confirmed guest snapshots save only that guest's progression.
- The same `stepWorld`/world actions remain authoritative for solo and host; only command delivery changes. Guests still consume snapshots rather than running a second simulation. All player snapshot rows are validated before any stage/actor/profile mutation, and derived stats are rebuilt without a revision shortcut. The 0.13.0 room contract replaces 0.12.0 admission and player snapshot shape, with no legacy adapter.
- PASS: 13 temporary actual-source/Matter progression checks: repeated start/restart, reload/save fields, corrupt or invalid profiles, unavailable storage, host conversion/next stage, pending join/restart, duplicate hello, confirmed guest purchase, recreated actor, leave/reload, identical 60-tick solo/local vs host/remote-command complete snapshots, atomic rejection of invalid player snapshots, and pending/retried invalid welcome. Storage/transport/DOM are doubles; this does not claim actual browser/RTC success.
- PASS: 33 existing actual-Matter combat/control regressions plus two recorded speed measurements; 11 jsdom menu checks; module/build and whitespace checks.
- PASS: actual PC Microsoft Edge 155 / NVIDIA on runtime commit `8ad12c140263e937a6943b1b36ca7fee9ad9b859`, 18 focused checks, zero runtime errors. UI investment survives solo start/restart/reload; distinct host/guest investments survive real RTC admission; confirmed guest investment survives leave/reload and a 390px solo viewport. Real keyboard dash capacity (3 solo, 4 guest), HP/survival, needle flight/pin, and an empty profile were exercised.
- The original `npm test` scenario stopped after 13 checks: its guest pre-start investment clicked the control skill without first selecting the Control tab. This was a test navigation error, not a product PASS. The PC temporary scenario with that missing tab selection passed 23 checks. The checked-in scenario now includes the same tab selection; no runtime HTML changes were made after the above product QA.
- Runtime HTML SHA-256 remains `0ee3a8f028c02cec1bf03988c6c0ef62a270de9f8368fb12ea5f267352cb3d57`. Build, scenario syntax and whitespace checks passed after the test/document-only correction. The uncorrected original scenario is not reported as passing.
- NOT VERIFIED: physical mobile devices, audible sound quality/playback, long sessions and wider multi-device/NAT conditions. The 390px browser viewport is not a physical phone. No repeated attempt at the earlier cancelled public-byte comparison.

Temporary checks remain outside the repository. No new workflow, dependency, save engine, alternate renderer or simulation.

---

# 0.12.0 first-survivor impulse and terrain pin candidate

Base: `2cd241e9b30d4b77140b9b6ea678e62467c8c064` (0.11.0). The prior implementation selected the terminal ricochet target, rewrote its velocity to 1200px/s every tick, canceled gravity, passed through platforms, and accepted only outer-wall contacts. That did not implement the requested first-target physical impulse and fast terrain impact.

- First surviving needle contact consumes the one-shot launch opportunity. Its incoming shot direction adds 720px/s once; subsequent needle ricochets keep their own trajectory. Dead targets are never resurrected, and the next actually contacted survivor may receive the impulse. Already controlled/cooldown-protected survivors do not refresh or transfer the opportunity to later targets.
- Flight uses ordinary Matter gravity, air friction and existing one-way terrain. Before-solver integrated velocity is captured once per physics tick. Real static terrain contacts project relative velocity onto the inward collision normal; only >=300px/s qualifies. No forced destination, distance-based snap, platform bypass, zero-speed post-solver check, or special grounded timer.
- Real contact points are projected onto the terrain face for pin VFX. One enemy-owned constraint holds for 1.2s. Stored contact normal controls wall/floor squash and outward sword rebound. Flight expires after 3s without promising a pin. Cooldown, merge exclusion, death cleanup and split rules remain intact.
- 0.12.0 room/welcome and 12-field control snapshot replace 0.11.0 together. The existing carry flag now tracks the shot's remaining launch opportunity. No compatibility wrapper, duplicate simulation or body reference is added to snapshots.
- PASS: 30 temporary actual-source scenarios with real Matter.js 0.20.0, plus two recorded speed measurements. Includes first-target independence, delayed ricochet damage and retargeting, dead-first target, actual platform and outer-wall pin, gravity/drag, tangential/resting floor rejection, normal-based floor rebound, constraint lifetime, controlled merge exclusion, sword regressions, snapshots and duplicate FX, and 160 controlled enemies in four wire chunks. DOM/render/audio are test doubles, not browser validation.
- At 30TPS, initialized normal speeds 250 and 350px/s became 245.5 and 343.7px/s after air drag before solving: the first did not pin; the second pinned, despite final velocity being zero. A 960px/s tangent with 60px/s inward speed did not pin. These measurements justify the normal-component threshold rather than total speed.
- PASS: 11 actual DOM/jsdom menu/navigation checks; `npm run build`; `git diff --check`.
- PENDING: actual PC Edge gameplay, visible first-target flight/terrain anchor, audio, and fixed real two-peer RTC scenario on this candidate. No Linux browser restriction was retried or bypassed. Parent coordinates this gate before merge/deployment.

Temporary diagnostic scripts remain outside the repository. Permanent scenario suite and Actions/Pages path are unchanged.

---

# 0.11.0 needle ricochet candidate

Base: `53d635d7629c458b8d674f3322ea4516cf45f497` (0.10.1). Control stage 2 replaces straight piercing with a single physically travelling needle, maximum three distinct enemy contacts and 420px per-hop acquisition/travel budget. Stage 1 carry/pin, stage 3 pinned-enemy sword rebound, sword skills, enemy merging and current menu structure are retained. GameKit remains pinned to 0.3.1. No Actions changes.

- Terminal contact (third enemy, or no next eligible enemy) carries its surviving target; intermediate contacts never carry. A target lost in flight is reacquired, including its merged successor. If no live eligible target remains, the needle expires without retroactive damage or pin.
- Stable distance/ID target choice and swept contact ordering. Visited merge lineage is excluded, preventing repeat-pair loops. Flight state stores scalar IDs, visited IDs, range and bounded trail points; no body references or local random target decisions.
- Snapshot schema and room admission move together to 0.11.0. Guests still render authority snapshots, not a new rollback/prediction implementation. Precise flight state roundtrips; event IDs deduplicate ricochet presentation on repeated frames.
- PASS: 26 temporary actual-source checks with real Matter.js 0.20.0, including three bent contacts and delayed damage, early terminal carry/range, lost-target reacquisition/expiry, pending-target merge, visited merge lineage, deterministic ties, two-enemy termination, actual final wall pin, flight-state roundtrip and duplicate FX suppression. Sixteen sword/control/merge/network-fragment regressions retained. DOM/render/audio are test doubles; this is not GPU/audio/RTC validation.
- PASS: 11 temporary actual DOM/jsdom menu checks; no tree/navigation regression.
- PASS: syntax/provenance build and whitespace check.
- PENDING: actual host Chrome gameplay, sharp-bend trails/tip spark/debris/ascending audio, responsive UI, and real multiplayer fixed scenario. Candidate is not merged or declared Stable until that gate passes.

Temporary test scripts remain outside the repository per project rules. Existing fixed user-scenario E2E remains the permanent browser suite. No browser restriction bypass and no fallback renderer.

---

# 0.10.1 menu and stat-tree verification

Base: `4ad0f36f36fe2a7a084194f035440a8ffbbd3378` (0.10.0). UI-only compatible patch; GameKit pin, combat definitions and 0.10.0 room/welcome contracts unchanged. No Actions changes.

Reference review: current `bloom-reference/rules/visual-ux.html` (P1, P4, P6, P7), development and project-management rules, plus current `bloom-bounko/index.html` direct category buttons / mini paths / stable details. As-is: all rules and multiplayer forms were stacked on the title; ten disabled-or-purchasable cards mixed inspection with spending. New flow: title → start → single/multiplayer; separate help; four directly visible categories and inspectable nodes with explicit purchase.

- PASS: syntax/provenance build and `git diff --check`.
- PASS: 11 temporary actual-source UI checks using jsdom 26.1.0 and actual DOM. Title visibility, start/back without starting a run, locked inspection, return route/focus, point spending only on explicit purchase, completed nodes, all categories and independent mobility roots, prerequisite navigation, help restoration, room role controls, pause/clear/dead menus, and direct tech routes without purchasing.
- PASS: 18 existing temporary combat diagnostics rerun with actual Matter.js 0.20.0. DOM/render/audio/transport presentation stubs; no real RTC claim. Updated temporary DOM stub for new datasets, then all 18 passed. No combat implementation edits.
- SOURCE REVIEW: 320/390 narrow layouts, three-node rows, 44px buttons, desktop split detail, short landscape shrinkable internal regions. Two review issues corrected: close restores the originating submenu; short landscape allows internal scrolling instead of fixed minimum rows overflowing.
- NOT RUN / ENVIRONMENT BLOCKED: actual browser screenshots/layout at 320/390/desktop, GPU gameplay, audio, live RTC and physical touch. Cloud browser rejects local `file:` navigation by protocol policy; previous game initialization failed for required WebGL, and shell Chromium has AF_UNIX restrictions. No restriction bypass or renderer fallback. Source review and jsdom are not visual verification.
- Existing fixed browser scenario updated for the new start/multiplayer hierarchy and separate inspection/purchase. It is not reported as passing this version; its runtime environment remains blocked. Temporary diagnostics are outside the repository and are not permanent tests.

Implementation and focused checks complete; actual visual/RTC validation remains outstanding. CI and deployed-byte verification are separate from gameplay validation. This does not claim Stable visual certification.

---

# 0.10.0 combat behavior trees

2026-10-14, dot Linux. Base `78e7e96000b88b0380b79e34faa58f66708c6d7e` (0.9.2). GameKit v0.3.1 / pinned distribution unchanged. No Actions changes, renderer fallback, network simulator or legacy compatibility layer.

- PASS: `npm run build`, module syntax/provenance, `git diff --check`.
- PASS: 18 temporary actual-source diagnostics using real Matter.js 0.20.0, including canonical `stepWorld` (30TPS). Completed in under one second, below the 180-second ceiling. DOM, renderer, audio and transport presentation were stubbed; these tests are not a browser/game E2E or live RTC result.
  - Swept needle hit order and once-per-target handling; independent three-target carry.
  - Actual outer-wall collision creates one pin constraint; platforms do not pin.
  - Carry expiry, pin expiry/gravity restoration, repeat-hit non-refresh and cooldown.
  - Enemy death and stage reset remove constraints and pending echoes.
  - Third-hit death schedules exactly two delayed 25% echoes after fragment grace, with no recursive echo or extra kill credit; dead enemies cannot be launched/carried/rebounded.
  - Third-hit survivor launch resists AI overwrite; pinned survivor rebounds inward and damages the first other enemy once.
  - Controlled same-tier bodies cannot merge; normal merging resumes after release.
  - Host snapshot/guest reconstruction and existing event-ID deduplication, without network transport. A 160-controlled-enemy frame (14,131 bytes / four fragments) reconstructs only when all fragments arrive; reverse order and duplicates are handled. Fixed sparse-array completion in the existing fragmentation path.
  - Same-tier rebound collision retains damage instead of instantly fusing; protected allies do not count as a successful sword hit or trigger advance.
  - First/second sword hits advance only on contact through actual physics.
- PASS: 200 temporary VFX geometry cases across ten tiers and carried/pinned/rebound/released states. 17,530 finite primitives, no body/entity mutation, wall flecks at wall contact X and rebound without an embedded needle. This is geometry validation, not a screenshot, GPU render or perceptual impact review.
- NOT RUN / ENVIRONMENT BLOCKED: actual GPU gameplay, audio playback, real Nostr/WebRTC and physical touch. Existing shell-browser startup is denied at AF_UNIX socket creation; supported cloud-browser game initialization previously failed with `WebGL 1 is required; no Canvas2D fallback`. Those restrictions were not bypassed. Historical 0.9.0 browser results below do not validate this version.
- Temporary diagnostic code/dependencies were kept outside the repository and are not added to permanent test commands. The existing fixed user-scenario browser suite remains the runtime E2E path.
- Version 0.10.0 replaces the old numerical sword/control nodes and enemy snapshot shape. Welcome and room namespace both require the new contract; no mixed-version compatibility is claimed.

Implementation and these focused checks are complete; real visual/RTC validation remains outstanding. CI build and public deployed-byte verification are separate from gameplay validation.

---

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
