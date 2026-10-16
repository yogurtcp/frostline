# Frostline — developer handover

Prepared 2026-10-06 against gameplay commit `2ea7b02` on `main`.
This is a snapshot for another coding model. Read the current diff and source before acting: later user instructions and later commits supersede this document.

## 1. Start here

Frostline is a phone-oriented, continuous downhill pixel-art skiing game inspired by SkiFree, with original assets, regular paid courses, and an Arcade survival campaign. It is a small vanilla JavaScript/Canvas project, not a framework app. There is no package-install step, backend, or database.

- Repository directory: `/home/yevgeny/Documents/Codex/2026-10-04/wil/outputs/frostline`
- Parent workspace: `/home/yevgeny/Documents/Codex/2026-10-04/wil`
- GitHub: https://github.com/yogurtcp/frostline
- Remote: `git@github.com:yogurtcp/frostline.git`
- Published game: https://yogurtcp.github.io/frostline/
- Publishing convention: built files in repository root on `main`, served by GitHub Pages.
- Main entry point: `index.html`, generated from source. Never make source fixes only in that generated file.

First actions:

1. Read this document, `CONFIG.md`, and `ARCADE.md`.
2. Run `git status --short` and inspect existing diffs before editing.
3. Identify the particular functions and config fields involved in the user's next request.
4. Make a focused change, preserving existing art, controls, tuning and local edits unless asked otherwise.
5. Rebuild when needed. Report exactly what was checked; do not claim gameplay was tested merely because a build succeeded.

### Commit identity: `[muse]`

The user wants commits made by the incoming model marked with **`[muse]`**. Prefix every commit subject created by that model, including fixes, config changes, documentation, and follow-up corrections:

```text
[muse] Adjust stage 6 tree density
[muse] Fix horizontal recovery on ice
```

Use meaningful subjects after the prefix. Do not relabel earlier commits or attribute existing code to yourself. If asked to squash your commits, retain `[muse]` in the resulting subject. Find your changes with:

```bash
git log --oneline --fixed-strings --grep='[muse]'
```

This handover itself was written by the preceding model, so its commit should not carry that marker.

## 2. Current practice settings and publishing authorization

The user explicitly authorized publishing the current changes, including the current practice settings:

| Field | Earlier campaign default | Current setting |
| --- | ---: | ---: |
| `arcade.startStage` | 1 | 1 |
| `arcade.autoStart` | false | false |
| `arcade.stages[0].yeti.count` | 0 | 0 |

At handover time the practice settings were `startStage` 2, `autoStart` true, and 4 stationary stage-1 yetis. The user has since returned to a summit start (`startStage` 1, `autoStart` false) and removed the stage-1 yetis entirely. Zero Yeti speed remains explicitly permitted. Treat the current JSON as authoritative; do not silently reintroduce earlier overrides.

The user's standing instruction is: **publish new versions freely; this is experimental, and unwanted changes can be reverted.** Commit and push completed changes to `main` without asking for another publishing confirmation. Continue marking the incoming model's commits `[muse]`. Keep source, JSON and generated HTML consistent.

Before editing, still inspect for newer user changes. Do not discard them or use `git reset --hard`. If the user later identifies specific settings as local-only, preserve them and exclude them from publication; the settings above are now explicitly authorized for publication.

## 3. Files and responsibilities

| File | Purpose |
| --- | --- |
| `game.js` | Entire simulation, input, spawning, collisions, AI, rendering, audio and save handling; roughly 1,660 lines at handover |
| `game-config.json` | Editable tuning source, including each Arcade stage and 59 individually configurable item types |
| `game-config.schema.json` | Editor completion and structural/range validation; mostly strict objects |
| `config.js` | Browser config loading, defaults for newer optional fields, validation and startup error display |
| `config_validation.py` | Equivalent build-time validation using Python standard library |
| `index.template.html` | Canvas layout and source/config/schema/asset insertion placeholders |
| `build.py` | Validates JSON and embeds code, config, schema and four PNG atlases into `index.html` |
| `index.html` | Generated, self-contained playable artifact; tracked in Git, about 6.5 MB |
| `serve.py` | Local HTTP server, loopback only, with no-store response headers |
| `assets/ski-sprites.png` | Main skiing/object atlas |
| `assets/village-sprites.png` | Village atlas |
| `assets/wildlife-sprites.png` | Animals and related sprites |
| `assets/tree-sprites.png` | Muted tree variants |
| `asset-prompts.md` | Existing asset-generation context |
| `README.md` | Gameplay overview and historical implementation details |
| `CONFIG.md` | Config sections, units and workflow |
| `ARCADE.md` | Stage editor reference, item catalog and baseline stage table |

Some older prose can lag behind newer mechanics. In particular, the final **Gear, towns and records** section of `ARCADE.md` describes the old four-gate sword/full-stage shield rate without qualifying the new combo ramp. Its newer **Gate combos and gear** section and current code give the correct formula. Numeric tuning in prose is secondary to the current JSON.

## 4. Build, run and config reloads

From the repository directory:

```bash
python3 build.py
python3 serve.py
```

Open http://127.0.0.1:8765/. Change the port with `python3 serve.py --port 8766` if needed. A server was started during the previous turn, but do not assume that process survives into a new task. Reuse an existing server when available rather than starting duplicates.

### Why local config edits appeared ineffective

- At **`file://.../index.html`**, the game uses the config snapshot embedded by `build.py`. Browsers restrict access to adjacent local files. Editing JSON alone cannot update this snapshot: rebuild and reload.
- At **HTTP/HTTPS**, `config.js` fetches `game-config.json` with `cache: 'no-store'` on startup. JSON-only edits apply on reload without rebuilding locally.
- Source code, schema, template and image changes still need a rebuild even on localhost: the served HTML contains those embedded versions.
- Changes are loaded at startup, not hot-applied to an ongoing run.
- Invalid config shows an error rather than quietly applying arbitrary values.

No build dependencies beyond Python's standard library. There is no npm build script. Optional JavaScript syntax checks:

```bash
node --check game.js
node --check config.js
```

Follow the active session's testing instructions. In this workspace, do not add or run automated tests unless the user requests them. Builds, source inspection, syntax checks and visual rendering are distinct from gameplay tests. This documentation request itself does not authorize a new test campaign.

## 5. Product rules and lessons from user feedback

These have been repeatedly requested; preserve them unless explicitly changed.

### Presentation and navigation

- **ZERO menus.** Choose courses by skiing between entry flags. Results and announcements overlay the ongoing world; they do not become modal screens.
- Portrait phone layout, mouse support and keyboard support.
- Small, readable pixel sprites with a large visible area. The user strongly rejected oversized, highly detailed sprites and bright, simplistic trees.
- Keep the muted palette, original assets, tiny characters and existing scale. Main player is about 22 screen pixels wide at current zoom.
- Generate new courses and villages below the visible screen. Objects must not suddenly appear in already visible areas.
- World height is the downhill position. Forest also exists uphill. This is not a persistent geographic simulation; distant scenery may regenerate.
- Towns offer relief and social interactions. The themed-district experiment was rejected; varied buildings, hotels and coherent winding streets were preferred.

### Controls and movement

- Keyboard left/right changes a discrete skiing stance; it is not simple held-key horizontal velocity while descending.
- There are distinct fast and slow diagonal ski angles, with distinct graphics. Straight downhill accelerates fastest.
- From zero speed, left/right walks horizontally. Only Up climbs. Upright body while climbing; no upside-down skier.
- Pointer control uses displacement from the initial touch/mouse position. Releasing a downhill slide points straight downhill. Releasing a walk/uphill movement stops with facing preserved.
- Phone jump: keep the steering finger down, tap with a second finger. Space jumps on keyboard. M toggles sound.
- Jumps lock heading and speed at takeoff. No steering in midair. Higher-speed jumps gain height/airtime. Airborne skiers clear trees SkiFree-style; only lodge/rental buildings still collide mid-air.
- Ice preserves entry direction, including sideways/uphill entry. Downhill ice accelerates beyond normal top speed; sideways/uphill ice does not gain downhill acceleration.
- Crashes wait for fresh input after the fall. A held key/finger must not automatically restart the player.
- Very slow collisions are harmless, with contact tracking until separation, to prevent repeated crashes while escaping an object. Ice recovery must allow a fresh sideways/uphill push.

### Towns and wildlife

- Towns have multiple rows of varied small buildings/hotels around a winding snow corridor; side paths route around houses. No fences.
- Snow-covered main roads use normal snow physics, including junctions. Exposed side paving slows skis.
- Main snow road now continues through the town-to-start approach. Ambient bears and sleeping yetis must not spawn in that approach.
- Shields are not consumed in towns or safe approaches. This is not universal town invulnerability: normal collision behavior still exists.
- Wolves are relatively rare, often in packs; predators hunt rabbits and wolves can threaten other skiers. Fast skiers taunt and aim somewhat toward the player.
- Cats, rabbits, foxes, pedestrians and harmless props have social interactions. Avoid breaking their state transitions when editing wildlife.
- A dog changing into a chaser must cease to exist as its original scenery entity. The duplicate-dog bug was fixed this way.
- Dog contacts at or below `physics.walkingBumpLimit` don't crash: the dog joins as a harmless chaser until separation. Faster tackles still crash.
- Yeti/bear high-speed knockout thresholds already exist. Inspect current config and collision logic before changing them; the desired distinction is near-straight full-speed Yeti hits versus easier bear knockouts.

## 6. Modes, rewards and failure behavior

### Regular courses

Regular mode has a persistent wallet, paid courses, timing and qualifying rewards. Most gate courses require at least 90% correct gates plus the finish crossing. Unpaid entries award no money or qualifying best time and can trigger yetis, persistent dog pursuit, or repeated ski-patrol waves. Ski patrol is intentionally prolonged rather than a single group stuck beside the player.

Classic `slalom` is gates and people in its corridor; other terrain stays outside. `Spore Decisions` is mushroom collection, not another gate slalom. Ordinary world mushrooms retain their old behavior; collectible course mushrooms are a separate case. Regular `Polite Pursuit` uses `politePursuit` settings. (No Arcade stage shares that name anymore.)

Timing begins at the actual start line. A qualifying fast finish gains a bounded time bonus. Saved bests include a signature of relevant rules so incompatible times are not treated as comparable. See `creditRun`, `timingSignature` and `timing` config.

### Arcade

- Physical Arcade entrance starts a named, ordered survival campaign, currently 20 compact stage rows.
- No entry fees, money rewards, or time-based qualification. Creatures create urgency.
- Towns connect stages automatically; no course selection between stages.
- **Missing the finish fails Arcade in place. Do not teleport or reset the world.** The player can continue skiing normally.
- Missing ordinary gates does not itself invoke the regular 90% failure rule. It breaks the combo and wakes that gate's penalty wolves, if it has any.
- Death ends the run and resets to the summit/configured automatic practice start, preserving the wallet.
- Completing the final stage ends the campaign; current code resets to the summit.
- `arcade.startStage` is one-based. Values above 1 are practice and do not replace full-run records. `autoStart` skips the summit approach and places the skier just above the stage's start, awaiting input.
- The campaign was condensed from 32 stages because progression was too slow and repetitive. First yetis arrive in stage 3.

### Gear combos: exact current formula

`state.arcade.combo` is shared by shield and sword gates:

```text
correct gate: combo = min(3, combo + 1)
missed gate:  combo = 0
charge gained = old per-gate charge × combo / 3
```

- First success: 1 point / one-third old charge.
- Second consecutive success: 2 points / two-thirds old charge.
- Third and later: 3 points / full old charge, not triple old charge.
- Shield then sword gives two sword points; shield, shield, sword gives three sword points; miss then sword gives one sword point.
- Sword full-rate charge is 1 unit. Sword threshold is `arcade.gear.swordGatesPerSword` (currently 4 full-rate units, equivalent to 12 new points).
- Shield full-rate charge is `shieldsPerStage / ordinaryGateCount` (currently a 1.5-shield stage budget before combo ramp losses).
- Inventory and partial charges persist across towns. So does the combo until a miss. New attempts start empty.
- Even a correct gate whose inventory is full advances the shared combo, but awards no stored charge.
- Gate labels show `+N% SHIELD/SWORD` (that gate's share of one full item) in three chain-tier weights/colors; no top CHAIN indicator exists. Top inventory icons fill gradually and brighten when ready.
- Shields automatically protect from falls (obstacles, dogs, people) outside towns. Swords automatically defeat lethal animal threats only: yeti/bear chaser catches and wolf attacks. Enemy bumps (bear, sleeping yeti, wolf) slow you via the shared `slowForEnemy` helper (`physics.enemySlowRetention`) instead of crashing and spend nothing; sleeping yetis die on any above-creep touch; fast ramming kills stay clean (kill plus slowdown, no fall, no spend). Dog tackles and people bumps still knock you down. See the exclusion/eligibility guards rather than assuming every collision spends gear.

## 7. Stage config: explicit tuning, no hidden balancing

The user wants direct control. **Do not introduce automatic Yeti speed math or retune player speed/gate spacing in response to a chase complaint without explicit agreement.**

The previous attempt to make the first Yeti stages faster was rejected and reverted. Stages 3–4 were restored to normal 103 km/h and 30 m vertical gate spacing. Absolute Yeti speeds then became editable per stage.

`arcade.stages` maps names to knob tuples `[obstacles, chase, miss, speed, ice]` (levels 1–4); map order is play order (currently 23 stages). Effective fields resolve per stage as `stageDefaults` plus that name's `stageOverrides` entry (same verbose field names, all optional; unknown names fail validation):

| Setting | Meaning |
| --- | --- |
| `knobs` | Five levels 1–4 from the compact row |
| `yetiColor` | Visual tier (teal/orange/violet) of the knob-driven start group |
| `gates.count` / `.swordGateCount` | Gate totals (geometry derives from speed knob; ice share from ice knob) |
| `tierRates` / `itemRates` | slightlyRare/veryRare defaults plus per-object overrides (tiers in `arcade.itemTiers`; common rate from obstacle knob) |
| `itemSpreadMetres` / `endTrafficMultiplier` | Placement range (default ±55 m; counts scale vs the 32 m reference to hold per-area density); skier/boarder ramp toward finish |

`arcade.knobLevels` holds the five level tables (obstacle rates, chase counts/speeds as percent of top, guarded-gate shares, ice-gate shares, top speeds) plus gate geometry as percents of top speed. Course length is the derived first run-out + `(count − 1) × derived vertical spacing` + derived finish run-out. Horizontal gate centres alternate at plus/minus half the derived horizontal distance. No extra Arcade gate sway is added.

Start groups resolve from the chase knob; `yetiColor` (teal/orange/violet) maps to internal slow/fast/elite visual tiers. Zero count disables the group. Waiting start-line yetis wake when the start is crossed. Pursuers belong to their run and have no distance leash; retire at its end. Sleeping Yeti item entries use the stage's knob-derived chase speed. Penalty wolves (`missWolves` per armed gate, at chase speed) sleep until their gate is missed or bumped. Hunting predators (yeti/bear chasers, wolves) route around trees. Every `predators.divertRecheckSeconds` a hunter may (`predators.divertChance`) divert to the nearest creature within `predators.divertRadiusMetres` (never another predator, and only prey nearer the player than the hunter: no backtracking); a catch eats it (`CHOMP!`, brief feed pause) and the hunt resumes, or the divert expires after `predators.divertTimeoutSeconds`. Wolves eat catches now; the old skier-knockdown is gone (its `npcWolfFallSeconds`/`wolfCaught` keys are unused).

Global `arcade.itemTiers` maps each of the 64 catalog keys (listed in `ARCADE.md` and `ARCADE_ITEMS` in `game.js`) to `common`, `slightlyRare` or `veryRare`. Each stage's `tierRates` sets the per-100m default for `slightlyRare`/`veryRare` while the obstacle knob sets `common`; `itemRates` overrides single objects, with explicit `0` disabling one and omission using the tier/knob rate. Rates are placement attempts, not guaranteed exact counts: collision, gate and landing clearances can reject a placement. `wolfPack` counts packs; `wolf` counts individuals. Town/ambient scenery has separate settings. Do not add a hidden background spawn stream inside Arcade that defeats these controls.

Gate ice is separate from randomly placed `smallLake` and `largeLake`. The ice knob sets the share of gates with ice from `knobLevels.iceGatePercent`, like the miss knob sets guarded shares. Selected gates vary per run. Their patches span the opening and intentionally bypass the ordinary gate-clearance restriction for lakes.

## 8. Code navigation and state ownership

Search function names instead of trusting line numbers; the source is compact and lines shift.

| Area | Main entry points |
| --- | --- |
| Startup and storage | async `FROSTLINE_READY`, `newPlayer`, `save`, `resetSummit` |
| Courses and transitions | `startCourse`, `creditRun`, `endArcade`, `finishArcadeStage`, `step` |
| Arcade config/spawns | `arcadeStage`, `ARCADE_ITEMS`, `createArcadeItem`, `prepareArcadeTerrain`, `spawnArcadeYetis` |
| Gear | `markArcadeGearGates`, `collectArcadeGear`, `useObstacleShield`, `useArcadeSword` |
| Village generation | `makeVillage`, `laneRoute`, `populateVillageLife` |
| Social behaviors | `updateVillageLife`, `greetSmallAnimal`, `touchVillageProp`, `updatePedestrians` |
| Protected terrain | `insideTown`, `safeApproach`, `humanArea`, `classicArea`, `protectScenery` |
| Ambient world | `ensureWorld`, `ambientType`, `spawnTerrain` |
| Ice/roads | `lakeGeometry`, `lakeContains`, `patchAt`, `onRoad`, `drawRoads` |
| Player/collisions | `movePlayer`, `crash`, `hit`, `tooSlowToCrash`, `launch`, `die` |
| Input | `keyboardDirection`, `inputVector`, `releasePointer`, pointer/key event handlers |
| NPC movement | `travel`, `updateSkiers`, `updateWildlife`, `updateChasers`, patrol functions |
| Art | `sprite`, `drawObject`, `drawHouse`, `drawTree`, `drawSlidingSkier`, `drawPlayer`, `drawChaser` |
| UI | bitmap `text`, `comboText`, `drawGearHUD`, `drawGearEffect`, `hud`, `touchControl` |
| Frame loop | fixed-step `frame` → `step`, then `render` |

Important distinctions:

- `S` is loaded config; `stages` aliases `S.courses`. `stages.arcade` is derived for the current stage.
- `state.course` is the active run; `state.arcade` persists across its stages and villages.
- `state.objects` holds scenery, gates and many NPCs. `state.chasers` holds active pursuers.
- Objects may carry `run`, `arcadeRun`, `chaseRun`, `town`, or `worldChunk` ownership. Preserve references and lifecycle cleanup.
- `state.plannedTown` exists before the player reaches it. Do not cull it simply because it is far away.
- `state.p.shield` is temporary invulnerability time. `state.arcade.shields` is inventory. They are not interchangeable.
- `state.p.awaitingInput` protects post-crash recovery. `slowContacts` tracks overlapping harmless contacts until separation.
- `state.deathYeti` identifies the eater; rendering animates it while the death timer freezes normal movement, then reset clears it.
- `state.roads` stores geometry and cached `tiles`/`bounds`. Delete both caches if changing a road's points.
- Lake geometry is cached on each object as `o.lake`. Rendering and collision must use the same polygon/holes.
- Physics uses world units; screen positions use camera offset and `render.zoom`. Defaults: 10 world units/metre, 0.5 zoom, `hudKmhPerSpeed` 0.2. Read settings rather than hardcoding conversions.
- World positions increase rightward and downhill. `belowView` is the helper for safe offscreen generation.
- Rendering sorts actors by world y. Ramps/moguls are ground scenery; keep them beneath the player.
- `spriteCache` keys depend on source name, size and visual variants. New variant parameters may require a cache-key change.

When adding config fields, update JSON, schema and any cross-field validation in both `config.js` and `config_validation.py`. Add optional defaults if backward compatibility is intended. Adding an item type also requires catalog, rendering/collision/AI support and docs; a schema entry alone does not implement it.

## 9. Saves and debugging hooks

The primary browser storage key is **`frostline-v2`**, with legacy fallback `frostline-save`. Saved fields include bank, regular bests/times, mute preference and Arcade records. An active run is not resumed on refresh.

Saves belong to the browser origin. `file://`, `http://127.0.0.1:8765`, `http://localhost:8765`, other ports, and GitHub Pages do not share a wallet. Switching to localhost can therefore look like a reset without deleting the old save.

Do not clear user saves during ordinary development. If explicitly asked to reset everything, remove both keys and reload so the legacy fallback cannot revive old progress. Prefer backing up the raw values before a requested migration/reset. `timing.recordVersion` and `arcade.campaignVersion` handle comparability changes without deleting the wallet.

The game exposes `window.Frostline` for deliberate debugging. Wait for `window.FROSTLINE_READY` and `Frostline.loaded` before using it. It exposes state, loaded config, step/render, course start, collision, world and other helpers. Read the export at the bottom of `game.js` for the exact current list. Never expose debug controls as a new player menu.

Local scratch rendering helpers exist under the parent workspace's `work/` directory, including `render-arcade-start.cjs`, `render-village.cjs`, and `render-gear.cjs`. They are not repository dependencies and may contain outdated assumptions. They use a VM and a locally installed Canvas library. The last turn also used temporary render scripts under `/tmp`; do not rely on those surviving. A staged render is visual inspection, not an end-to-end gameplay test.

## 10. Recent history and verification limits

| Commit | What happened |
| --- | --- |
| `1dd8467` | Condensed campaign and visible start-line yetis |
| `51d37f9` | Attempted gate-following pursuit calculations and faster/wider early Yeti courses — rejected |
| `aaadaf2` | Reverted that attempt |
| `9604394` | Individual item densities, explicit speeds/colors/gates, practice start controls |
| `2ea7b02` | Shared combos, safe town approaches/snow connectors, dog fixes, gate ice percentage, jumping Yeti celebration and local server |

The latest implementation passed build validation, JS syntax checks and staged visual review of combo labels and Yeti celebration. It has not been comprehensively playtested on phones or through all stages. Do not turn this handover into a claim that every mechanic is verified.

The user re-reported slowdown at the town NEXT sign (Oct 2026) and asked for a fresh investigation. Root cause: per-step full-array scans in NPC pathing (`travel` validity probes ran `patchAt` over all objects and `houseClearance` over ~160 houses per probe) plus per-rabbit/wolf predator scans. Fixed with a per-step ice list cache, a house grid, and a hoisted `hunters` list; headless town step 112→9ms, verified bit-identical over a 400-step differential run vs HEAD. Follow-up batch: cached road bounding boxes for `onRoad` (1.2→0.02ms), single-cell house grid queries via inflated multi-insert, shared ice-cache helper for pedestrians, fused single-pass ped/wildlife filters with Set lookups, `includes()`→`===` in per-object loops, and an x-prefilter plus hypot reuse in player collision; town now ~4ms, dense scene 133→~7ms, still bit-identical. Render side (~9.4k canvas calls/frame in town, Y-cull only, no X-cull) measured but left alone — revisit only if browsers still feel slow.

No new gameplay request is pending in this handover; wait for the user's next specific edit. Keep the guide updated when mechanics or workflow materially change.

## 11. Practical delivery discipline

- Preserve local config and saves. Stage named files deliberately.
- Keep fixes focused; do not rewrite the engine or replace the established art to simplify a task.
- Rebuild `index.html` with source changes and commit the intended embedded config, not accidental practice overrides.
- Prefix the incoming model's commits with `[muse]`.
- Standing publishing authorization: push completed new versions to `main` without reconfirmation. This is an experimental project and the user accepts reverting unwanted versions. A push publishes through Pages; do not claim the deployment is already live merely because the push succeeded.
- Give concise progress updates and a final summary of changes, checks actually performed, and any unresolved issue.
- If a requested result is ambiguous, inspect existing code/context first. Ask only the missing question that matters; do not repeatedly ask permission for routine authorized edits.

## 12. Interactive slope features (2026-10-09)

Added `fallingTree`, `logJump` and `rollingSnowball` to the Arcade catalog (now 64 items), schema and item tiers. All default to `slightlyRare`, respecting existing stage rates/overrides; Warmup normally uses its zero rare rate, with the temporary demo override described below. Their tuning lives in the new `terrainFeatures` section. The existing local `arcade.autoStart: true` was preserved and included under the standing publication authorization.

`entity('wideLog', ...)` creates its uphill `logBump` as an owned companion. `obstacleSegment`/`obstacleClearance` use capsule footprints for the log and fallen trunk; hunter routing uses these footprints in the existing spatial grid. Log bumps launch only downhill above the walking threshold, retaining normal jump heading lock and enough airtime for the log. `updateTerrainFeatures` handles fixed-direction tree warning/fall and snowball warning, diagonal movement, growth, swept contact and cleanup before protected town approaches. Old `snowball` is still stationary.

New transparent PNGs: `assets/falling-tree.png`, `assets/wide-log.png`, `assets/rolling-snowball.png`. Generated with the built-in image tool using the existing tree atlas as style reference; exact prompts are recorded in `asset-prompts.md`. `build.py` embeds all three, including offline play.

Verification: build/schema validation, JavaScript syntax checks and staged native-scale rendering. The environment blocks opening a local HTTP listener; no phone playtest or full campaign test is claimed.

### Temporary opening demo (removed; historical)

At the user's request, stage 1 now always creates one `logJump` between gates 5–6, one `fallingTree` between gates 7–8, and one `rollingSnowball` between gates 10–11, following its existing rugged/small-hill/large-hill demo. The log and tree sit on the centreline; the snowball starts 36 m left and rolls right. These three objects carry `openingDemo: true`. The clearly marked `TEMPORARY` block in `startCourse` is the entire placement override; removing it restores tier-only spawns for these features. Existing stage configuration is untouched.

Also fixed a helper-name collision introduced with these features: numeric capsule distance is now `obstacleSegmentDistance`, preserving the original point-object `segmentDistance` used by roads and patrol contact.

### Log scale and snowball timing follow-up

User requested a 20× longer log and 3× longer jump bump. Log width is now 100 m (1000 world units / 500 screen pixels at default zoom); bump width is independently 15 m (150 world units / 75 screen pixels). `heightMetres` keeps the log's drawing thickness independent of length. Replaced the active art with `assets/wide-log-v2.png`, featuring mostly brown bark and a recognizable cut face. `sprite` can accept a height and tile the centre while preserving both end caps; horizontal culling uses the actual wide-log extent. Normal Arcade placement now checks capsule footprints so other scenery does not overlap the long log.

Snowball release now uses `snowballIntercept` to predict the moving skier's crossing. `triggerDistanceMetres` is a maximum arming range (120 m), not an immediate start trigger. A stopped/recovering skier cannot release the snowball. Warning lasts at least its configured duration and can wait longer if the skier slows. At release, fixed lateral speed plus one downward-velocity adjustment align the predicted intersection; no homing occurs after release. Nominal `downhillSpeedKmh` guides the timing, with release adjustment capped at lateral speed. A staged straight-run rendering produced an actual skier collision after waiting and warning, rather than firing as soon as the skier entered the arming range.

### Sideways tree, jumping and curved snowball follow-up

The user reported stretching/noninteractive tree animation and requested longer-range snowballs, jump clearance for all three features, visible tracks, scenery collisions with animated breakup, and natural accelerating sinusoidal motion. Falling trees now rotate rigidly around their base toward the skier’s left/right side, preserving sprite dimensions. `treeTilt` feeds both rendering and `obstacleSegment`, so the collision capsule follows the rotation and stays sideways after landing. `fallenRadiusMetres` is 3 m for trunk/branches, used during the fall too. Airborne contact with `wideLog`, `fallingTree`, and `rollingSnowball` returns before slow-contact bookkeeping or other effects.

Snowball arming range is now 240 m and travel range 270 m. Motion starts at 15% speed and accelerates exponentially over a 1.5 s time scale toward the configured downhill speed (90 km/h). X follows a cosine-offset sinusoid around a fixed centre, with 24 m half-width and 5 s period in accelerated distance time. Lateral speed caps the cycle frequency. `snowballIntercept` finds the first projected crossing on the opening bend; warning/release still predict interception instead of starting immediately at the arming distance. At release the curve is locked and downhill speed can adjust once, capped at 125% of nominal; no homing follows. `rollDistance` measures actual curved travel.

`state.snowballTrails` stores compacted snow segments for 8 seconds, rendered below objects and cleared on reset. Sampling short swept steps against `obstacleClearance` handles solid scenery, including long/rotating capsules and house footprints; ramps, hill surfaces and collectibles are excluded. Predator contacts also break the ball. `breakSnowball` removes collision immediately and runs a shrinking/fading ball plus 28 scattered fading chunks, then removes the entity after 1.1 s. Tracks outlive the impact.

Verification: syntax and build/schema validation plus staged native-scale renders of sideways fall, grounded trunk impact, airborne tree/log/snowball clearance, accelerating interception, visible curved tracks and scenery breakup. The staged straight skier was hit at 4.55 s; jumping through the crossing produced no fall. No full campaign or phone playtest is claimed. Publishing remains unavailable in this environment because the GitHub hostname cannot resolve.

## 13. Implementation review and hill art (2026-10-11)

See `GAMEPLAY_REVIEW.md` for findings and three focused gameplay experiments. Hill SVG sources were edited directly and rasterized to their matching PNGs: small 28×22, large 56×36. They now have higher crests, folded snow lips and shaded faces; world widths/radii and jump physics are unchanged. `drawHill` reads the PNG aspect ratio. `preview-hills.png` (ignored local preview) shows actual gameplay size and enlarged pixel samples.

Fixed jump surfaces being marked touched while cooldown prevented launch. Also deferred landing feedback until after obstacle and chaser collisions, suppressing false “SOFT LANDING” announcements on crashes; existing jump scoring is unchanged. Source inspection identified the cooldown bug; staged scenes reproduced the false landing feedback and verified both corrected behaviors. Syntax/build validation passed. No full campaign/phone playtest or automated suite is claimed.

Open review finding: ball sway half-amplitude 24 m means its first bend can only reach 48 m toward the skier, while Arcade placement is ±55 m. A ball at −55 m stayed waiting as a straight skier passed. Arming range and travel range do not expand lateral coverage. The −36 m opening demo remains reachable. Suggested follow-up is explicit placement/sway alignment; no automatic stage retuning was introduced. Suggested fun experiments are short authored jump lines, brief rejoining route forks, and grounded close-pass rewards, with the jump line recommended first. These new mechanics are proposals, not implemented features.

## 14. Bear pursuit and quadruped art (2026-10-11)

The user reported slow bears, brief chases and teddy-bear upright poses. Main chase tuning was only 85 world units/s (17 km/h), versus skier speeds around 90–110 km/h; helper spawns also used a 0.27 player-speed ratio. All bear spawns now use the explicit `wildlife.bearChaseSpeed: 500` (100 km/h). `bearRoamSpeed` is 40 (8 km/h), wake radius 340 (34 m), and wild chase distance 10000 (1000 m of skier downhill travel). The legacy helper ratio field stays in the schema for config compatibility but is ignored for bears. No Yeti, wolf or player speed was changed.

Wild bear expiry is preserved when leaving/off-piste from an unrelated course and when a dog/patrol bump cancels other non-course chasers. Explicit course ownership still retires a bear at its run's end. Town/safe-approach and protected-piste rules, terrain avoidance, airborne clearance, swords and bear knockout thresholds are unchanged. Helper bear spawns also receive the configured wild chase distance.

`assets/bear-sprites.png` is a built-in imagegen strip with two walking and two running quadruped poses. Existing wildlife PNG is preserved. Exact prompt in `asset-prompts.md`. New atlas source `bears`, with `bear`, `bearWalkAlt`, `bearRun`, `bearRunAlt`, uses consistent 500×280 crops. `build.py` embeds the new strip. `drawBear` selects gait frames only while actual movement occurred this step, faces actual travel direction, and renders 60 world units / 30 screen pixels wide. Ambient/catalog bears and knocked-out bear art use the same width. Bear catches say “THE BEAR CAUGHT YOU.”

Verified syntax/build/schema validation and staged native-scale frames. A six-second, obstacle-free pursuit held 100 km/h, closed the gap from 249.8 to 120.8 world units, and remained active after 287.5 m of skier travel (past the previous 210 m limit). Off-piste/course-exit scenes preserved bear expiry, a dog knockdown preserved it too, and a bear stayed outside the protected town. Preview is `preview-bears.png` (ignored local artifact). These staged checks are not a complete campaign or phone playtest.

### Bear speed correction

The user found 100 km/h too difficult to escape. Bear chase speed is now explicitly 400 world units/s (80 km/h), below the roughly 90–110 km/h straight downhill skiing speeds. Fast downhill skiing can open a gap, while slower turns remain vulnerable. Keep the 34 m wake radius, 1000 m wild chase range, course ownership, town protection, and four-legged animation from the prior revision. Earlier 100 km/h staged pursuit measurements above describe the initial revision, not the current speed. Build/schema validation passed for this tuning-only correction.

### Explicit 30 km/h bears and directional enemy pursuit

The user rejected 80 km/h and explicitly requested 30 km/h bears plus half-speed non-downhill pursuit, especially the X projection. Current `wildlife.bearChaseSpeed` is 150 world units/s (30 km/h downhill). `predators.offDownhillSpeedRatio: 0.5` halves horizontal X and negative/uphill Y components; positive/downhill Y remains full speed. Thus pure sideways/uphill bear pursuit is 15 km/h; diagonals scale X independently of downhill Y. Earlier 100/80 km/h entries are historical tuning.

`chaseVelocity` supplies the shared component rule. `travel` has an optional chasing flag; both avoidance probes and final movement use the transformed velocity, so routing follows the actual slowed direction. Applied to course/wild yeti and bear chasers, direct dog/legacy patrol pursuit, ski-patrol passes, and wolves with an active hunt target. Ordinary animal wandering, fox/rabbit activity, friendly skiers, player controls and configured downhill speeds of other enemies remain unchanged. Longer bear persistence, 34 m wake radius, town/ice protection and quadruped art remain active.

Verification: syntax and build/schema validation passed. Staged production movement measured bears at 30 km/h downhill and 15 km/h sideways/uphill; a diagonal produced X 10.61 and downhill Y 21.21 km/h. Yeti/dog scenes, wolf hunting, patrol steering and bear tree avoidance also confirmed component scaling. No automated suite or full campaign/phone playtest was run.

## 15. NPC prey commitment review (2026-10-11)

The user saw a Yeti approach then leave a fox and suspected recurring attack rolls. Source review found Yeti/bear/wolf NPC selection already guarded by `!divert`: probability checks happen every 1.5 s only without a committed NPC target. Foxes are explicitly excluded from `CREATURE_TYPES`, along with other predators; the observed fox was not an eligible hunt target. Existing avoidance turns or pursuit toward another target can visually resemble an approach. No prey eligibility changes were made.

Found and corrected a separate abandonment issue: the fixed eight-second diversion lifetime canceled even progressing hunts. Shared `updatePreyTarget` now refreshes that deadline whenever the best target distance falls by at least one world unit (0.1 m), preserving target commitment while making progress. Eight seconds without progress still drops the target; dead/eaten/zero-radius prey is released. Selection does not reroll during committed hunts. Wolves and both Yeti kinds/bears use the same helper. `divertTimeoutSeconds` retains its value but now means stalled-hunt timeout; schema descriptions and CONFIG/README document the interpretation.

Staged production scenes compared the prior source to the corrected source: both Yeti kinds, bears and wolves dropped a slow reachable chase before the change but retained the same target beyond ten seconds afterward, without advancing their selection timer. Separate scenes confirmed stalled release, immediate dead-target release, fox exclusion and successful prey capture. Syntax and build/schema validation passed. No automated suite or full campaign/phone playtest is claimed.

## 16. Skier fear of bears and Yetis (2026-10-11)

The user noticed skiers feared wolves but ignored bears and Yetis. Root cause: `frighten` was called only in the wildlife wolf update; awake bears/Yetis reside in `state.chasers`. `updateSkiers` now gathers wolves/roaming bears plus active bear/Yeti chasers once per step and selects the nearest eligible threat for each skier/boarder. Shared 31 m radius, five-second fear memory, fleeing speeds and speech cooldown remain unchanged. Fear interrupts cat/social stops. Dead, stunned, leaving, expired, sleeping/waiting and warming-up threats are excluded; vanished threats clear remembered fear.

`courseCreature` also recognizes `chaseRun` ownership, so an active course-owned pursuer can frighten NPCs on its own piste while towns and protected areas still suppress ordinary threats. Added `dialogue.bearTerrified`/`yetiTerrified` with matching strict schema entries; wolf dialogue remains unchanged. Sword rescue clears fear for any defeated threat, and wolf pack gratitude now explicitly checks the remembered threat is a wolf.

Staged production scenes reproduced absent bear/Yeti fear in the prior source, then confirmed fleeing and warning speech for wolves, bears and both Yeti kinds, including snowboarders and roaming bears. Also checked nearest-threat selection, interruption of social stops, dead-threat clearing, sleeping Yeti exclusion, protected-piste refuge and course-owned Yeti fear on its piste. Native-scale preview: `preview-predator-fear.png` (ignored local artifact). Syntax and build/schema validation passed. No automated suite or full campaign/phone playtest is claimed.

## 17. Put animated encounters along the skiing route (2026-10-11)

The user found falling trees/rolling balls too peripheral. Both shared the full ±55 m scenery spread. Tree opening clearance also incorrectly used its sideways length as longitudinal radius, rejecting most placements near the gate route. Added `arcadePathX` (interpolated gate route) and `arcadeEncounterY` (between-gate midpoint, with a one-gate fallback). New per-feature `pathPlacementChance: 0.9` biases placement attempts toward that route; `pathOffsetMetres` is [4,9] for trees and [12,24] for balls. Tree offsets cap at 75% of height; ball offsets cap at 1.5× sway amplitude. Remaining ball placements are limited to twice sway amplitude minus maximum ball/player radius, resolving the earlier ±55 m unreachable-placement finding. These limits describe lateral route coverage; player motion and scenery can still prevent interception.

Tree longitudinal gate clearance now uses fallen radius/player clearance, while transverse clearance retains trunk length. Biased midpoint placements ignore the generic proximity exclusion for gate ice, but still avoid actual ice at the base, openings, other interactive features and landing areas. Stage rates/count scheduling remain configured as before; collisions can still reject attempts. Route-adjacent trees store `fallTowardX` and fall across the route instead of choosing the side from the skier's position several gates uphill. Off-route trees still fall toward the skier. Temporary Warmup tree is 7 m right of the route and its ball moved from 36 m to 18 m left; intervals remain unchanged, as does the log.

Staged actual course generation covered stages 1,2,3,7,8,12,23 (0–100% gate ice). In a concentrated placement scene, old trees within 25 m of the route numbered 1/33 without ice and 2/33 with full gate ice; revised placement gave 30/31 and 29/33. Revised balls within 25 m numbered 28/30 and 26/29; all were within the default 48 m lateral reach. Opening tree fell across the route, and a focused straight skier scene had ball release, a 0.024 m closest crossing and visible tracks. Native renders: `preview-route-tree.png` / `preview-route-snowball.png` (ignored local artifacts). Syntax/build validation passed. No automated suite or full campaign/phone playtest is claimed.

## 18. Remove temporary first-level encounters (2026-10-11)

At the user's request, removed the `TEMPORARY` `startCourse` block that hardcoded a log jump, falling tree and rolling snowball in Warmup. Their normal configured placements and route bias remain active in other stages; Warmup's zero slightly-rare rate means none of these three spawn there by default. Its earlier rugged/small-hill/large-hill introduction remains. Earlier opening-demo entries and previews above describe historical revisions. Source inspection, JavaScript syntax and build/schema validation passed; no automated tests were run.

### Remove the remaining opening terrain demonstrations

The user also requested removal of the slowdown patch and jump hills. Deleted the entire remaining stage-one-only placement block for `rugged`, `smallHill` and `largeHill`. Warmup now uses only normal configured course generation, with no scripted terrain demonstrations. The preceding statement that its older hill introduction remains is historical and superseded. Normal catalog entries and per-stage terrain rates remain available. Source inspection, syntax and build/schema validation passed; no automated tests were run.

## 19. Casual turns and nearby aggressive traffic (2026-10-11)

The user requested occasional random turns for slow skiers and gradual, nearby player aiming for fast skiers. `updateSkiers` now gives moving non-fast skiers a new left/right/straight decision every 2.5–5.5 s, with 80% turn chance, lateral target half their downhill speed and eased steering (follow 1.4). Their lane anchor limits drift to roughly ±18 m plus easing overshoot. Fear overrides this behavior and reanchors the lane around the escape position. Stationary skiers and boarders retain their prior normal movement.

Fast aiming formerly tested only a positive downhill gap, allowing far-side steering and ignoring nearby traffic ahead of the player. It now uses actual Euclidean distance within 350 world units (35 m), including from ahead or behind. Weight increased .55→.75 and follow reduced 2.5→1.2 for gradual lane cutting; lead .35 s and maximum lateral speed 90 world units/s remain. Beyond range steering eases to zero. Existing collision, avoidance, social stops and enemy fear are preserved. New casual steering fields and the proximity interpretation are documented in the strict schema and CONFIG.

Staged production movement compared prior/current source. A 40 s casual scene previously had no sideways movement; after the change it made ten timed decisions, moved both ways at up to 37.5 world units/s and stayed within ±18.84 m of its lane, preserving downhill speed 75. Nearby fast skiers at 18 m steered gradually from ahead and behind; skiers at 81 m sideways or downhill did not aim. Left/right symmetry and bear-fear override were checked. Syntax/build/schema validation passed. No automated suite or full campaign/phone playtest is claimed.

## 20. Center long logs on the route (2026-10-11)

The user reported encountering a long log's end rather than its middle. Rendering and collision geometry already use `o.x` as the midpoint; the fault was `logJump` still using ordinary ±55 m random X scatter. It now always uses `arcadeEncounterY` and `arcadePathX`, with no sideways offset. Occupied placements try up to eight neighbouring gate gaps while keeping the midpoint on the route and retaining existing opening, ice, feature/landing and capsule-footprint checks. Generic gate-ice proximity is allowed as for the other midpoint encounters; actual ice at the base still prevents placement. The owned bump naturally shares the log's X coordinate, 4.5 m uphill. Widths, jump physics and configured density scheduling are unchanged; clearance may still reject attempts.

Staged actual generation with a translated course origin (X 250) reproduced old midpoint offsets up to 65 m in stages 3/8. Revised sampled logs align with the interpolated gate route to floating-point precision. Concentrated scenes with 0%/100% gate ice each produced 13 centered logs, with shared bump midpoint and route coverage within the bump width. A focused centered approach jumped and cleared the trunk without falling. Native preview: `preview-centered-log.png` (ignored local artifact). Syntax/build/schema validation passed. No automated suite or full campaign/phone playtest is claimed.

## 21. Pursuit around trunks and Yeti marker cleanup (2026-10-11)

The user reported a Yeti stuck behind a long log and an unexplained blue bar. Short local avoidance turns kept directing the hunter back toward its target before reaching the trunk end. `travel` now accepts the actual hunt target and detects blocking log/falling-tree capsules using segment separation and the existing tree grid. It retains a chosen endpoint and two buffered corner waypoints until the hunter crosses around that end, then resumes normal pursuit. Endpoint selection prefers the shorter route and penalizes corners blocked by existing terrain/protected-area checks. Local avoidance still handles nearby trees, houses and ice; half-speed horizontal/uphill pursuit remains active. The shared tree-object set invalidates routes when their obstacle disappears, and a target returning to the hunter's clear side cancels an unnecessary detour. Applied to lethal Yeti/bear chasers and hunting wolves, including course-owned and NPC-targeting hunters.

The blue detail was a Canvas tier/scarf decoration, not a health bar. Removed horizontal bars and scarf stubs from active and waiting Yeti drawing. Sprite tier tint and existing waking/waiting indicators remain.

Staged production scenes reproduced the original stall for 40 seconds. Revised centered slow-Yeti and wolf approaches cleared the 100 m trunk in about 5.2 seconds; a 30 km/h bear cleared it in about 8 seconds. Left/right approaches selected the nearer end, a blocked left corner selected the right, and a fallen tree and removed obstacle were handled. A course-owned Yeti also cleared the trunk while the player kept skiing downhill, remained owned by the run, and did not retire. Two separated logs and an uphill target both completed their detours and resumed pursuit. Native preview `preview-yeti-log-detour.png` confirms the marker removal (ignored local artifact). Syntax/build/schema validation passed. No automated suite or full campaign/phone playtest is claimed.

## 22. Interleaved special stages (2026-10-12)

The user approved six short, focused stages and asked to retain their names. Added Keep Your Momentum (3, after Denser Forest), Rush Hour (5, after Monster), Aim Before Ice (7, after Miss and Be Eaten), Air Time (10, after 2 Fast 2 Forest), Timber! (12, after Darker Woods, Icy Lakes), and Snowball Run (14, after Dense Chase). The original 23 rows retain their relative order, knob values and overrides. Total is now 29; startStage 1 and autoStart true remain authoritative. Campaign revision 4→5 separates previous records. Take the Shortcut/fork mechanic remains a proposal, not implemented.

New optional strict-schema stage override fields are specialLayout, briefing, and yetiSpeedPercent; config.js supplies none/empty/null defaults to preserve ordinary stages. Layout selection is independent of stage name so rows can be moved or copied. prepareArcadeSpecialLayout creates arranged encounters before random placement and reserves rectangles against later scenery placement. jumpLine/momentum use straight gates, barriers between gates, hills 18 m uphill, and spacing based on expected flight plus landing room. Air Time has five large hills alternating three long logs and two five-pine rows, additional forest, and three violet Yetis at 105% of its 105 km/h top (110.25 km/h). Only this stage overrides Yeti speed; guard wolves retain knob speed. Keep Your Momentum has six small hills paired with existing rough patches and no enemies. Ice islands use every other slalom gap, leaving snow to steer. Timber has seventeen alternating-side trees; Snowball Run has ten alternating-side balls and sparse trees/hills. Rush Hour uses narrow-spread high skier density, two Yetis and modest fast/overtaking traffic. Other rarity tiers are zero for these stages to keep their focus. Arranged encounters are independent of itemRates, which add surrounding objects; set specialLayout to none to remove an arrangement.

Stage-start briefings explain the mechanic. Rounded displayed course lengths avoid long decimal strings in the HUD and start message; geometry is unchanged. ARCADE and CONFIG document fields, insertion points and direct practice numbers.

Verification: schema/build, JavaScript syntax and diff checks passed. Existing JSON stage rows/overrides and non-Arcade sections were compared and preserved. Staged native generation/rendering confirmed the six layouts and exact configured pursuer counts; one Rush Hour scene produced 63 skiers plus three overtaker triggers and nine boarders. Full staged straight descents through Air Time and Keep Your Momentum cleared 24/24 and 20/20 gates with five/six jumps, no falls and no death; Air Time retained its configured active pursuers during the descent. Focused rough-snow scenes showed 45 km/h grounded vs 108 km/h airborne and no slowdown in flight. Ice locked incoming heading and snow restored steering; Timber fell across the route and a Snowball Run ball released with visible tracks. Ignored local preview: preview-special-stages.png. No automated test suite or full campaign/phone playtest was run. Publishing is still subject to the environment's GitHub DNS availability.

## 23. Earlier, clearer Yeti introduction (2026-10-12)

The user asked to check that core concepts are introduced simply before harder combinations, suggesting a Yeti in stage 2. Denser Forest now has chase knob 2: one teal slow Yeti at 45 km/h, half the stage's 90 km/h downhill top. New reusable `specialLayout: "yetiIntro"` reserves the route through the first three gates (about 111 m) against random clutter, then permits normal forest and traffic. Its brief explains the chase. Removed its rare-object rate, dogs and extra pedestrians; normal forest/skier/boarder tuning remains. The layout clears space only and does not implicitly add or tune a pursuer. Names, numbers, practice settings and campaign revision 5 are unchanged.

Review found rare-tier defaults could place animated hazards before their focused stages. Added explicit zero itemRates for logs before Air Time (10), falling trees before Timber! (12), and rolling balls before Snowball Run (14) wherever their earlier rates were nonzero. This is configuration-based lesson sequencing, not a runtime unlock system. Jump/rough-snow practice already occurs in enemy-free stage 3 before the log/jump challenge, and enemy-free ice practice at 7 precedes icy chases at 11+. Stage 6 introduces marked missed-gate wolves at 25% guarded gates; later stages increase that share. ARCADE documents the progression and configuration restrictions. The earlier section's statement that every original knob/override is unchanged is superseded by this deliberate stage-2/progression revision.

Verification: production course generation for stages 1–14 sampled first appearances at Yeti 2, jumps/rough snow 3, wolves 6, ice 7, logs 10, falling trees 12, balls 14. Stage 2 generated exactly one slow teal Yeti and no collidable course objects in its reserved opening. A staged 3.5-second approach woke it after crossing the start, cleared the first two gates reached, had no fall/death, and opened a 47 m final gap; the third gate was beyond that simulation window. Source inspection confirms the earlier advanced-feature rates are zero rather than relying on a sampled absence. Syntax, schema/build and diff validation passed; no automated suite or full campaign/phone playtest was run.

## 24. Keep Your Momentum as a hard slalom chase (2026-10-12)

The user corrected the intended stage: normal gates, plenty of trees, one very fast Yeti slightly above sliding speed, and later placement after faster-Yeti introductions. Moved Keep Your Momentum from 3 to 9, after Fast Monster (now 7) and 2 Fast 2 Forest (8). Its name is unchanged; early rows shift down by one, Air Time stays 10 and later rows are unchanged. It now uses knobs 12121, a 105 km/h top, one violet Yeti at explicit 105% (110.25 km/h), and pine/fir/spruce/small-pine rates 1.4/1.0/.7/.7. All other stage rows/overrides and practice settings remain as before. The previous enemy-free stage-3 tutorial descriptions above are historical and superseded. No replacement tutorial stage was added.

Only jumpLine now suppresses gate swing. The momentum layout retains standard slalom geometry and puts six small-hill/shallow-rough-patch pairs along every third gate leg using arcadePathX, rather than the centreline. Hills use calculated short per-encounter jumpSeconds and landingY limits; hit caps their airtime before the next gate so steering can return for the turn. The paired rough patches have shorter Y extent for these hops. nearArcadeFeature honors that local landing limit instead of clearing the next 95 m around every short hill, and reserved corridors protect just the selected leg while surrounding forest remains. Other hills/manual jumps and Air Time's long jumps retain their prior physics. Docs and current stage table reflect the changed role and row numbers.

Verification: syntax/schema/build and diff checks passed. A generated stage had 53 trees, six hills and rough patches, one Yeti at 110.25 km/h, normal 30.3345 m alternating gate swing and 38.1465 m vertical spacing. Isolated left/right hop scenes at normal diagonal speed and carried speed cleared rough snow without slowdown/falls, landed before the next gate and cleared its opening. Both keyboard 30-degree directions also cleared the patch and next gate. Native preview: preview-momentum-slalom.png (ignored). A separate gate-aiming descent which did not avoid trees crashed and was caught after three gates; this is deliberately a harder forest chase and that scene is not evidence of full-stage human playability. No automated suite or full campaign/phone playtest was run.


## 25. Crowds, chaotic ice and lively villages (2026-10-12)

The user reported never seeing Rush Hour Yetis hunt skiers. Source review found a 5 m prey radius competing with a 31 m skier fear radius and 1.5 s selection checks, so NPCs usually escaped selection. Increased predators.divertRadiusMetres to 35, preserving 50% chance, 1.5 s checks only when uncommitted, and progress-based commitment. Added protected-area prey exclusion/release except for active course-owned hunters on their course; towns remain safe. In the same generated 20-gate crowd scene (seed 12345, fixed selection RNG), the original radius produced no hunts; the new radius produced two visible hunts and one eaten skier. The user then explicitly chose 40 gates: Rush Hour is now about 1,365 m. Its longer staged scene produced six hunts/four catches, with the first two selections visible; later pursuits can be behind the camera because the skier outruns the Yetis. No Yeti speed increase was introduced for Rush Hour.

The user replaced Aim Before Ice's gentle lesson with a chaotic ice challenge while keeping its name. Its stage-6 override now uses iceChaos, 24 gates, skier/boarder traffic and sparse trees. This layout creates randomly sized/offset irregular lakes (44–68 m across, 44–62 m downhill before shape modulation), three NPCs on each approach, and one wolf plus one orange Yeti on each snowy far bank. Its start-line group stays zero; bank Yetis use 70% of the 90 km/h top (63 km/h). Shore wolves wait until prey is nearby on snow; shore Yetis can wake from a nearby exiting NPC as well as the player, and hold position while their selected target is still on their lake. Both retain ice avoidance. This intentionally supersedes the earlier enemy-free tutorial descriptions.

NPC skiers/boarders previously avoided ice unconditionally via travel. Friendly skier calls now allow entering it; updateSkiers captures incoming travel heading/speed, locks heading even while afraid, applies the player's downhill ice acceleration/top limit, and coasts back to ordinary steering/speed on snow. Ice overrides cat/social distractions. Other animals, pedestrians and predators retain their ice restrictions. Actual movement stamps supply correct collision velocities.

The user requested more Keep Your Momentum bumps and three Yetis so one sword cannot end all pursuit. Stage 9 now uses chase knob 4 for three violet Yetis, retaining 110.25 km/h (105% of its 105 top), normal gates and forest. The momentum layout places one short hill/rough pair in each of the 19 gate gaps, moved farther into each leg to leave turning space; landing still releases steering before the next gate. Generated scenes had 51–52 trees. Left/right keyboard-30-degree hops cleared rough patches and next gates without falls or slowdown.

Village titles/HUD previously hardcoded Snowdrift. village.names now has 32 names, chosen without repeats until exhausted; town.name propagates through title, HUD and stage completion. village.backRoute (enabled, width 100, offset 310 world units) reserves a natural snow corridor before houses are placed. It branches near entrance, follows behind the outer house rows, and rejoins the main road before exit/choices. It remains in the road network for footprints/snow surface priority but is not painted; paved crossing tiles are filtered once when cached. BACK WAY / MAIN ROAD signs mark its ends. Layout clearance and snow physics are shared with the main route; no teleport or menu is involved.

Added bakery/cocoa/toyshop sprites in assets/cozy-buildings.png and 24 red/yellow/green idle/chat/wave/serve poses in assets/people-animations.png, generated with the built-in imagegen skill/tool. Full prompts, refinement, alpha validation and measured crops are in asset-prompts.md. build.py embeds both atlases; strict schema/config include their entries. Shops keep ordinary house footprints, while flower boxes, porch lights and wreaths add variety. Villagers chat in pairs, wave at the passing skier, and bakers visibly offer warm bread; toymakers greet visitors. Serving takes priority over petting. Backyard dogs hop/wag when approached and snow-playing neighbors toss harmless particle snowballs. Snowmen/pets/snow play never spend shields or cause a fall. These are cosmetic interactions, not new food inventory or buffs. Both hanging-out and handing-out interpretations are covered by the new poses. Earlier people/house PNGs remain unchanged.

Campaign revision 5→6 separates records after the longer crowd level and new ice layout; wallet/practice settings stay intact. README/CONFIG/ARCADE were updated, including the distinction between gate ice percentages and separately arranged lakes.

Verification: JavaScript syntax, strict schema/build and diff checks passed. Actual production canvas scenes generated 40-gate Rush Hour, 19-pair/3-Yeti Momentum, and six irregular lakes with six wolves/six bank Yetis plus traffic in one Aim Before Ice sample; every shore guard started off ice. NPC ice entry/acceleration/exit and zero heading drift while frightened were staged. Shore wolf/Yeti waiting and subsequent dry-bank pursuit were observed, never entering ice. Three native village layouts had different names, 72–75 houses, zero paved back-route samples and at least 64 world units of centreline clearance from houses across about 400 samples each; all joined before the exit. Pet/snow-play/baker proximity interactions triggered with no fall. Protected-town prey was excluded and an existing target released, while active course prey still qualified. New poses and shop facades were inspected in native renders. Ignored previews: preview-rush-prey.png, preview-ice-chaos.png, preview-village-entry.png, preview-village-back-way.png, preview-village-bakery.png. No automated test suite or full campaign/phone playtest was run. Publishing still depends on the environment's GitHub DNS availability.

## 26. Remove village route signs (2026-10-13)

Removed the BACK WAY / MAIN ROAD sign entities and their drawing branch at the user's request. The natural snow route behind the houses still branches and rejoins as before. JavaScript syntax, strict schema/build and diff checks passed.

## 27. Keep Yeti/bear diversions on the way to the player (2026-10-13)

The user reported large distracting NPC detours. The previous selection rule only required prey to be nearer the player than the hunter, allowing sideways targets and prey beyond the player. Added preyOnPlayerPath for fast/slow Yeti and bear chasers: selection requires a forward projection between hunter and player, prey nearer the player, at most 8 m perpendicular offset and a 30-degree heading deviation. Active hunts allow 12 m / 45 degrees. Each diversion saves its starting position; both hunter and prey must also stay within 12 m of that origin-to-current-player segment, preventing gradual drift from redefining the route. Limits track the live player position, including diagonal routes and player turns.

Crossing a limit drops prey immediately, clears old avoidance commitments, resumes player pursuit the same step, and sets nextDivertCheck one selection interval ahead (1.5 s) so it does not immediately swap NPCs. Existing progress-based eight-second stall release, catches, prey exclusions and protection rules remain. Wolves retain their roaming prey choices. Four optional predators settings expose selection/release widths and angles with loader defaults; schema/browser/build validation require release limits at least as large as selection limits. Predator speeds and campaign/practice settings are unchanged. CONFIG/README describe the new behavior.

Verification: JavaScript syntax, schema/build and diff checks passed. Native production staged scenes for both Yeti kinds and bears selected ahead/on-route prey, rejected side/near-side/behind/beyond-player prey, retained modest drift, released wider drift and accumulated hunter drift, and resumed movement toward the player with selection cooldown. Diagonal player routes selected prey; a player direction change released the now-off-route target. A progressing on-route hunt stayed committed beyond ten seconds without rerolling; stalled hunts released and on-route captures still ate prey. Wolves still selected sideways prey. In matching 40-gate Rush Hour scenes (seed 12345), the previous source made eight selections/four catches with 45.82 combined hunter-seconds of NPC pursuit; the new source made two brief visible selections, no catches and 0.925 combined hunter-seconds, spending more time pursuing the player. This is one staged descent, not a full campaign/phone playtest; no automated suite was added or run.

## 28. Connect Arcade stages into continuous slopes (2026-10-13)

The user requested seamless groups of three with monsters accumulating until a town, plus configurable linking/town placement. Added optional arcade.stageFlow with townEveryStages 3 and linkedStageGapMetres 0. A named stageOverrides entry can force/skip its boundary via optional townAfter true/false; omission uses numbered multiples of the cadence, and overrides do not reset that numbering. Default towns follow 3/6/9/12/15/18/21/24/27; 28–29 end the campaign. Practice starts enter at the selected stage and continue to its next boundary. The final stage always ends the campaign. Loader/schema and ARCADE/CONFIG/README document the fields and editable examples. Campaign revision 7 separates records; current startStage 1 / autoStart true remain.

Separated regular-course starts from Arcade group planning/activation. planArcadeStage builds every run in a connected block before it enters view, reserving each in safeTrails; one town/lift destination is planned after the block. First-start/last-finish run-outs retain ordinary geometry, while internal ends/starts use half the local gate spacing plus any extra link gap, keeping gate rhythm. Internal boundaries have no finish flags, start stripes, spectators or results card. Crossing by downhill distance activates the prepared next stage and updates its banner/HUD. Player object, speed, heading, airborne state, gear/charges and combo remain. Gate numbers/score/time are per-stage; cumulative records count stages once. Actual group finishes still fail outside their opening. Miss/recovery logic checks the run that was crossed so the newly activated run cannot be mistaken for a missed old finish. Final completion/death/reset retain their prior behavior.

activeCourseOwner shares ownership across runs in a block, preserving Yeti/bear pursuit, off-piste leashes, NPC fear, prey eligibility and avoidance across joins with each hunter's original speed. Awake/alerted course wolves acquire linkedChase, retaining pursuit and world presence beyond ambient activity/cleanup distance until the group ends. Sleeping penalty wolves still wait for their own gate. Penalty pack IDs include stage number so same-number gate packs cannot alert each other across stages. Terrain planning preserves adjacent runs' authored objects, explicit course predators avoid ambient scenery protection conversion, and planned fast traffic uses its own stage speed. Town finish/failure retires all block chasers and scenery predators; scenery monsters walk away harmlessly and cannot reactivate. The town NEXT label points beyond the whole group.

Verification: JS syntax, strict schema/build and diff checks passed. Native inspection covered all ten default groups, each with one village/start stripe/actual finish and correct town/NEXT positions. Early equal-speed link gaps were 32.697 m; speed changes use the average stage spacing. Named Monster:false / Rush Hour:true overrides created a 1–4 slope, an 18 m extra gap yielded 50.697 m between early gates, and cadence 1 restored separate-stage geometry. Live staged crossings preserved a 450-unit airborne skier, gear/combo and original-speed Yeti/bear/wolf pursuit; town retired the whole group and its exit started 4–6. The 8→9 change retained momentum while adopting the 105 km/h cap. Final 28→29 completion, actual finish failure and ordinary Slalom construction were staged. A continuous steering-guided 1–3 descent cleared all 92 gates with no fall/death, kept the stage-2 Yeti active into stage 3 and reached Coldwater; it used a protective shield to isolate transitions, so this is not evidence of full human playability. A staged wolf remained present/moving across two joins when 1,327 m behind, then retired harmlessly at town; 61 penalty packs in 16–18 had 61 distinct IDs. Native preview preview-linked-seam.png (ignored) was visually inspected. One VM planning sample took ~2.21 s for three stages versus ~1.60 s for the prior single-stage/town plan. No automated suite or full campaign/phone performance/playtest was run.

## 29. Investigate and reduce the first-town exit slowdown (2026-10-13)

The user reported severe slowdown just after the first town as stage 4 appears. Reproduced the town→4–6 transition with the production game in a native Canvas/VM scene (fixed village randomization seed 24681357). Instrumented scratch copies isolated two distinct costs: the exit step built the next village/group in ~5.04 s, including ~4.48 s of repeated laneRoute house clearance checks, and later simulation steps averaged 101–116 ms. The persistent cost came from stage-6 shoreline Yetis scanning every skier for ice before checking whether the skier was anywhere near that Yeti. Linking stages made those distant guards active in the object list already during Rush Hour.

Moved the cheap prey distance condition before patchAt in shoreline wake detection. patchAt now shares freshIceCache's ice-only list, with array-identity invalidation and invalidation when entity adds ice, so removal/addition/reset within the same frame remains correct. No waking, hunting or ice rules were changed. Village lane searches share memoized fixed-grid clearance results across house paths, with cheap footprint bounds before exact checks; the temporary map is released after planning. House placement samples its fixed initial roads once and uses bounds before exact clearance. Road tile caching no longer recalculates full-road edge distances for repeated accepted cells; edge calculation happens once per cached tile, and distant tiles are rejected before screen-coordinate allocation with rounding slack. Geometry, cell order, appearance and config remain intact.

Verification: JS syntax, schema/build and diff checks passed. In the final matching profiling scene, post-exit/visible-stage steps averaged 11.82/10.14 ms (previously 115.71/100.98 ms); the exit step took ~470 ms (previously ~5,043 ms), including next-village creation ~320 ms versus ~4,802 ms. Cold town road caching fell from a ~2,068 ms peak to ~325 ms; cold sprite conversion remains separate. These VM timings are comparative, not a phone FPS guarantee, and group construction still has a shorter one-off cost. Fixed-RNG staged snapshots matched gameplay state at the town, exit and stage-4 view (excluding pure caches/date fields); decoded renders had zero differing pixels in all three views. Ice creation/removal in the same frame and summit reset were also staged. Scratch profiling/comparison files live in /tmp/frostline-review; no test suite was added, and no full campaign/phone playtest was run. Config, grouped-stage flow and practice settings were not changed.

## 30. Fairer Keep Your Momentum chase (2026-10-13)

The user requested 90 km/h player speed, 90.5 km/h Yetis, a distinct special appearance and more adjustment time in Keep Your Momentum. Stage 9 now uses speed knob 1 (knobs 14111), retains three Yetis, and replaces yetiSpeedPercent 105 with exact yetiSpeedKmh 90.5. Optional per-stage yetiSpeedKmh takes precedence over percentage/knob speed; optional yetiWakeSeconds overrides the global start-line delay. Momentum uses 4 s rather than 0.8 s and its briefing announces the adjustment period. Earlier linked-stage monsters continue at their original speeds. Air Time retains its previous tuning; campaign version 7 and startStage 1 / autoStart true remain.

Added yetiColor magenta → special tier with accent #c844a2 and RGB body tint [212,30,156], visibly distinct from pastel violet/orange/teal. Uses the established sprite palette/rendering, with no new PNGs or floating markers. Knocked-out poses now retain their tier tint as well; waiting/running/celebration already did. Loader supplies special tint/accent defaults for older configs and resolves optional exact-speed/wake fields; strict schema documents their ranges and supports magenta in stage defaults/overrides. README/CONFIG/ARCADE list the current 90/90.5 tuning, four-second delay and editable fields.

Verification: JS syntax, strict schema/build and diff checks passed. Production native scenes resolved 90 km/h player cap, three special-tier Yetis at 90.5 km/h, 20 gates and all 19 hill/rough pairs. Straight chase movement measured 90.50000000001455 HUD km/h. Yetis remained stationary through 3.9 s and moved after 4 s; direct player contact was harmless during the grace and lethal afterward. A linked 7→8→9 entrance retained player speed 90, four earlier hunters at 63, and three new Yetis at 90.5 with exactly four seconds remaining. Left/right keyboard-30-degree hops cleared rough snow, landed before the next gate and passed it without falls at the new spacing. Waiting, running and knocked-out magenta bodies were visually inspected in preview-momentum-magenta.png (ignored). Air Time resolved its original 105/110.25 km/h, violet tint and default 0.8 s wake delay. No automated suite or full campaign/phone playtest was run.

## 31. Turn Momentum into a big-jump run; boost moving jumps everywhere (2026-10-13)

The user disliked the slowdown/hop-heavy stage and requested more large jumps, rainbows, fewer slow zones and consistently faster jumps. Found and preserved their uncommitted config tuning: startStage 9 / autoStart true, 40 Momentum gates and 92 km/h Yetis. Player top remains 90, three magenta Yetis and four-second wake delay remain. Replaced the momentum layout's one tiny hill/rough pair per leg with alternating full-size large hills/rainbows: seven large hills, six rainbows and only three short rough patches below selected hills at 40 gates. A six-leg pattern leaves slalom sections between long aligned-gate flight corridors; short straight recovery legs mirror the next cycle's launches across left/right lanes. Ordinary slalom geometry/other layouts retain their normal gate formula.

Arcade runs now record gateYs/gateXs. Momentum extends its jump gaps from speed, boosted flight time and run-up/landing room, and its route/encounter interpolation uses those actual positions. Large hills have about 1.65 s of full flight; Momentum rainbows use a local duration cap of 1.3 for about 1.82 s, keeping their full height/color effects. Landing limits release steering before the next gate. Safe clearings protect takeoff/flight/landing while surrounding configured forest remains. Stage length is about 2,698 m in the user's practice start and 2,674 m when linked from 8; later finish/town placement uses the actual extended end.

Global jump.speedBoost is now 1.25 and validated above 1. launch immediately updates speed/velocity to at least 125% of ordinary movement speed; downhill jumps use the full stage top even when turning or rough snow reduced takeoff speed. Duration/height use that restored movement baseline. Already faster momentum carries without repeated multiplicative acceleration; stationary jumps stay in place. Every existing manual/terrain jump type shares this path. Also found helpful jump surfaces were incorrectly suppressed by p.shield recovery protection. Moved their guarded launch handling before that protection return, keeping falling/awaiting-input/air/cooldown/slow-contact rules. Rainbow trails/temporary ground boost and log clearance remain. README/CONFIG/ARCADE describe the redesigned layout and global boost, including the user's latest speed/gate/practice tuning. Config/schema/build sources remain consistent; campaign version remains 7.

Verification: syntax, strict schema/build and diff checks passed. Native production scenes generated 40 gates, 7 large hills, 6 rainbows, 0 small hills and 3 rough patches. Large/rainbow corridors gave full 1.65/1.82 s flights at 112.5 HUD km/h, cleared rough snow and landed before/passed the next gate. Manual, ramp, mogul, mushroom, both hills, rainbow and log-bump launches from 45 km/h all immediately reached and measured 112.5 km/h, including with recovery protection. A real manual jump from rough snow also restored 112.5 and cleared onRugged. Repeat jumps held 112.5 instead of compounding; existing 150 km/h momentum stayed 150, and stationary flight speed stayed zero. A guided full descent took all 13 alternating jumps, cleared 40/40 gates, spent no frames grounded on rough snow and reached the town. It used a protective shield to isolate layout behavior; this is not evidence of human completion. Linked 7–8–9 geometry joined exactly, kept the finish at the actual new end, placed town 30 m after it, and labeled next stage 10. Rainbow flight/trail was visually reviewed in ignored preview-momentum-rainbow-flight.png. No automated suite or full campaign/phone playtest was run.

## 32. Add skier traffic to Keep Your Momentum (2026-10-14)

The user requested more skiers in the redesigned jump stage. Stage 9 now explicitly uses itemRates.skier 4 and fastSkier 0.25, with the existing endTrafficMultiplier 1. Regular skiers supply most traffic; fast skiers are occasional. Existing gate/jump corridor placement exclusions apply to their starting positions. All speed, Yeti, jump, gate and practice settings are preserved. CONFIG documents the rates; generated index.html was rebuilt.

Verification: strict schema/build and diff checks passed. Three native production generation scenes retained 40 gates, seven large hills, six rainbows and three rough patches, with no skier starting inside a reserved jump corridor. The first two scenes placed 182–185 regular skiers and 11 fast skiers across the roughly 2.7 km stage; actual counts vary with random placement and spread scaling. No automated suite or full human/phone playtest was run.

## 33. Add jump-versus-gate dilemmas to Momentum (2026-10-14)

The user found jumps and gates too synchronized, then clarified that some encounters should require choosing gate/combo/gear versus jump/escape speed so Yetis can regain ground. Removed Momentum's aligned launch gate pairs and straight recovery legs: every gate now alternates sides. The stage plans its jump encounters once before gate/terrain construction. Launch gaps vary by two to four gates at the current 40-gate count; hill/rainbow order and takeoff positions vary. Counts and length remain seven large hills, six rainbows, three rough patches and about 2,698 m in practice.

Four randomly selected interior jumps sit late on the previous gate's outer side, opposite the imminent gate. Their downhill escape line skips that gate and rejoins at the following gate; landing is bounded before the subsequent turn. First/last encounters are excluded from these choices. The other nine jumps are offset from the slalom line but can be aimed through their next gate. Reserved approach/flight/landing space follows the intended branch; rough patches follow selected hill flight lines. Helpful jump behavior, global 25% airborne boost, skier traffic, 90/92 km/h player/Yetis, three magenta hunters, four-second wake delay, 40 gates and practice startStage 9 / autoStart true remain. Briefing now reads GATES FOR GEAR - JUMPS FOR SPEED. CONFIG/ARCADE/README and built index.html are consistent.

Verification: JS syntax, strict schema/build and diff checks passed. Five native generation scenes each had the intended counts, four competing jump branches, varying launch gaps and zero straight gate pairs. A shield-protected gate-first guided descent cleared 40/40 gates while taking zero automatic terrain jumps and reached town. Four staged jump-first branch descents missed the competing gate, cleared the following two gates, flew at 112.5 km/h for about 1.46–1.57 s and landed at least 18 m before the later turn. Nine ordinary aimed jumps cleared their next and following gate (or final finish), retaining full 1.65/1.82 s flights at 112.5 km/h. Directly staged takeoffs isolate flight geometry, and protection isolates collisions; these are not human completion or chase-difficulty measurements. Linked 7–8–9 still joins exactly, places the single finish at the actual end and town 30 m afterward. Ignored preview-momentum-choice.png was inspected: the offset rainbow and competing gate are both visible ahead. No automated suite or full human/phone playtest was run.

## 34. Remove old stages 10–11 and restart the campaign (2026-10-14)

The user found Air Time uninteresting, asked what it contained, then requested removing both it and Darker Woods, Icy Lakes and replaying from the beginning. Air Time was a 24-straight-gate jump-over-obstacles lesson: five large hills, three logs and two five-tree rows, plus three violet Yetis at 110.25 km/h versus a 105 player top. Its automatic aligned sequence had little decision-making after Momentum's improvement. Darker Woods was another ordinary forest/ice variant after Aim Before Ice's stronger lake introduction. Removed both rows and both named overrides. No remaining stage tuning or game simulation code changed. The reusable jumpLine layout remains available for custom stages.

There are now 27 stages. Stages 1–9 keep their numbers; Timber!, Dense Chase and Snowball Run are 10–12, and every later old row moves up two places. Town cadence remains three stages: towns after 3/6/9/12/15/18/21/24; 25–27 finish the campaign. Set startStage 1 for replay and preserved a newer user edit setting autoStart false, so startup/reset waits at the summit with the Arcade entrance starting Warmup. Campaign revision 8 archives incomparable revision-7 records after the changed stage order. README/CONFIG/ARCADE were renumbered, the stale Momentum schema description was corrected, and index.html rebuilt.

Verification: strict schema/build and diff checks passed. JSON comparison against the previous commit confirmed exactly the two row/override removals, startStage 1, revision 8 and the user's newer autoStart false; all other settings are identical. Native generation inspected the old Air Time inventory before removal, then confirmed a 27-stage loaded campaign without either removed name. Groups 1–3, 7–9, 10–12 and 25–27 have exact joins, one start/finish and their finish at the actual final run end. Next-stage labels for the first three groups are 4/10/13. Momentum retains 40 gates, seven large hills, six rainbows, four competing choices and 90/92 km/h tuning. A staged final-finish crossing recorded ALL 27 STAGES COMPLETE! and returned to the summit without starting a nonexistent stage 28. No automated suite or full human/phone campaign playtest was run.

## 35. Add separate Endless Mixed Slalom (2026-10-15)

The user selected Endless Mixed Slalom as a separate mode alongside Arcade. Added a centred second-row summit entrance at y=650, before the existing free-ski fallback at y=730; the original four choices keep their positions. No menus. The new optional strict-schema endless section has loader defaults for older configs. Default endless.autoStart is false (both it and Arcade remain false), with an optional direct start that takes precedence over Arcade when both are enabled. Arcade's full 27-stage config, campaign version 8 and stage-1 start are unchanged.

Endless uses one root course with infinite endY and a shared ownership block, bounded rolling 240 m terrain batches and a 180 m below-view buffer. Internal batches are invisible; no stage transitions, finish lines, towns, lifts or chase resets are generated. Root gates retain continuous numbering/combo and accumulate cleared/missed totals. Reuses the existing placement, collision, NPC ice control, route-aware predator prey AI and shield/sword behavior. The finite terrain planner now accepts an Endless root gate owner and preserves its authored lakes; ordinary Arcade behavior is unchanged. No mandatory jump/gate pairing. Hills/rainbows can be chosen for speed at the cost of a gate.

Player top is 90 km/h. Pressure approaches bounded late rates with a 2,800 m ramp, 900 m intensity waves and smoothly varying forest/lake emphasis. Gates stay 38 m apart, opening narrows 19→14 m and swing grows 11→16 m each side; every eighth is a sword gate. Existing shieldsPerStage gives shield charge across 35 ordinary-gate equivalents. Trees, slow/fast traffic and occasional jump densities increase. First lake is at 350 m; existing irregular shapes vary from about 40 to 68 m across with offset snowy bypasses and at least 110 m between centres. Skiers enter ice and lose steering as before. Yetis start around 700 m, desired capacity rises one per 900 m to max 4, counting dormant and awake hunters together. Encounter intervals taper 650→300 m, generation speed 68→94 km/h with matching teal/orange/magenta tint. Nearby lakes get bank guards; otherwise hunters wait beside the route. Waking gives 2.5 s notice, and ice is respected. Hunters more than 180 m behind retire to keep slots useful; they are not teleported or accelerated to catch up.

Old batch references/scenery and runaway fast traffic are removed, while one safe-trail root remains. Endless owns its own version-1 distance record under the existing frostline-v2 save alongside wallet/times/Arcade records. Best distance saves each 250 m and on death/reset. Death returns to summit and displays a short nonmodal distance/best overlay. HUD shows Endless, distance, best, flags/misses and shared gear. Config/schema/build validator/README/CONFIG/ARCADE are consistent. The schema's Endless course entry uses placeholder ordinary fields only for the physical entry name/colour; actual speed/gates/length resolve from Endless.

Verification: syntax, strict schema/build and diff checks passed. A staged production native continuous 3 km gate-guided descent cleared 77 gates, missed two, earned two shields/two swords, took one jump, spent 638 frames on ice and encountered NPC falls and up to two hunters. It used protective player shielding to isolate progression, so it is not a human difficulty or survival result. In that VM scene, simulation averaged ~1.21 ms/step with a ~12.05 ms peak; not a phone FPS guarantee. Rolling generation was also inspected through 20 km: no towns/finishes, at most five retained batch descriptors and 259 objects in the isolated scene, continuing gate numbering past 500. Death saved the separate distance and reset cleanly. Actual straight keyboard-style summit movement entered Endless; the first attempted entrance at y=820 failed because free skiing auto-entered at 730, and was moved to 650 before final verification. Existing Arcade 7–9 still has the same names/Momentum choices and one town/finish; regular Slalom still plans 19 gates and its town. Ignored previews preview-endless-entrance/opening/lakes/live.png were reviewed. No automated suite or full human/phone playtest was run.

## 36. NPC skier falls and remove fall immunity against predators (2026-10-15)

During Endless implementation the user also requested skiers crashing with their own animation, recovery after 4–5 s and vulnerability to being eaten, plus fixing Yetis apparently waiting for the player to stand. Found the player crash function set p.shield equal to the whole fall duration. Actual falls now clear that shield: repeated obstacle contacts remain suppressed by awaitingInput, but lethal predators can reach/eat the fallen player. Equipment shields still prevent a crash, and brief manual-resume protection is retained. Chaser speeds, pursuit ownership and prey decisions are unchanged.

Skier/boarder movement now uses a nearby-object collision grid and swept footprint checks before normal movement, including on ice. Trees/rocks/trunks/structures/sleds/snowballs/other skiers cause a fall above the existing minimum impact speed; flags, ice and helpful jump surfaces do not. Player/NPC impacts can knock both down when the player actually crashes. A downed NPC stays stopped with positive collision/prey radius and resumes after a random configured skiers.crashSeconds [4,5]. Their own sprite/clothing tumbles sideways, lies with scattered poles/brief dazed motion, then rises in the final getUpSeconds 0.6. Uses existing NPC poses and Canvas transforms rather than the player's orange fall sprite or new bitmap art. Recovery steers away from the previous collider, ignoring that collider until clear to avoid immediately repeating the same fall. Killing a predator clears nearby fear but no longer cancels an NPC's fall timer.

Verification: native production collision scenes showed a tree impact, a ~4.84 s down time, no movement after 3.33 s, then resumed motion after recovery. A committed Yeti ate a downed NPC. A real player tree crash had shield 0 and a moving Yeti caught the player while still fallen. Rendered tumble/down/get-up phases were inspected separately with the player stationary. Native Endless step timing above includes the new NPC collision grid, and Arcade/regular construction was checked. No automated suite or full human/phone playtest was run.

## 37. Faster Endless progression, rising pace and varied course encounters (2026-10-16)

The user requested faster Endless progression, gradually increasing player speed with correspondingly scaled encounters, towns that allow existing Yeti pursuit but no new Yeti spawning, and varied branching tree/glacier/castle obstacles. Only the endless JSON section changed. Difficulty ramp is 1,200 m (was 2,800), waves 650 (was 900), first lake 220 m (was 350), first Yeti opportunity 420 m (was 700), capacity rises one per 650 m and encounter intervals taper 450→240 base metres. Starting speed remains 90; maxPlayerSpeedKmh 130 and speedRampMetres 2,400 make the top approach 130 gradually (about 103 at 1 km, 115 at 2.4 km, 125 at 5 km). Furthest-distance progression prevents speed dropping when walking back uphill.

Speed scale is current top / starting top. Planned gate spacing/openings/swing, lake dimensions/offsets, authored corridor length/width, scatter spread, generation batches/lookahead and hunter scheduling/retirement distances scale with pace. Scatter rates divide by scale squared to preserve time-density while the two spatial dimensions expand. NPC cruise/flee/steering, NPC/player ice acceleration/top and wake/fear/prey-path distances scale conditionally for Endless-owned traffic/hunters. Existing course Yetis now keep a progression-assigned base speed and multiply it by the same live pace scale, so old hunters remain proportionate too (68–94 base; late max ~135.8 vs player 130). Global physics, Arcade rows/campaign/start, ordinary-course tuning and NPC fall timers are unchanged. Loader/schema/build validator cover optional new max-speed/ramp/encounter fields and ordered ranges. Endless record version is 2; previous version's record survives in previousVersion, with wallet/Arcade records separate.

A bounded encounter scheduler starts around 450 m and alternates special encounters with 300–480 base metres of open terrain. Encounters span 180–240 base metres, clear-lane width 18–23 before pace scaling. A shuffled bag guarantees each town/tree/ice/ruins theme once per four, with no immediate repeats across bags; the first is a town for this playtest. Three path families (fork/rejoin, winding chicane, split islands/rejoin) vary in mirroring, bend, width and length, with theme-specific construction. Tree passages use dense existing pine/fir walls; glacier blocks and castle walls have rectangular footprints shared by player/NPC collisions and predator avoidance. Glacier passages include straight icy strips with snowy banks. Ruins add keeps, weathered masonry, broken snow-capped battlements, arch gates, sparse buried paving and wider courtyard variants. Uses code-native pixel rendering plus existing assets, with no new PNG requirement. Row corridor bounds are memoized during construction then released to avoid repeated per-block path work.

Gate groups now support alternative branches: one number/progress/gear award per cross-section, either paired gate accepted. Junction gates widen before splitting; alternate unused gates fade without false miss/charge labels. Normal single-gate scoring and penalties use the same crossing helper. Gates follow encounter paths, and random static terrain/lakes are excluded so authored paths cannot be filled by scatter. Encounter planning leads the chunk boundary to reserve upcoming towns before lake/guard placement. Corridor guards are placed on reachable snow banks rather than outside the wall. Owned hunters commit to an encounter branch waypoint and rejoin beyond it, while retaining existing collision avoidance and NPC prey rules.

Course towns are compact, generated from existing house/shop/people and snow-road assets, with forks/side lanes, no stage cutoffs, finishes, lifts, new course entrances or gear reset. Town names cycle through the configured name list without repeats until exhausted. They are flagged by endlessRun and have explicit bounds. Only active run-owned pursuers gain the exception to protected-town travel and prey rules; existing Yetis may enter and attack. Scheduled guard positions reject town interiors; ambient spawning already skips towns. Gear remains usable in course towns, while normal villages remain protected. Retained encounter descriptors, roads and town records are pruned along with terrain, without changing the current root course.

Verification: syntax, strict schema/build and diff checks passed; JSON comparison confirmed every non-Endless setting unchanged. Across native staged generation scenes through 20 km, all four themes and all three variants per theme were observed, with no dormant Yeti placements in town, no finishes, bounded batches/encounters/roads/towns, and centreline clearance above 118 world units for sampled static footprints. The final arch-position run generated 25 encounters and retained at most three encounter descriptors and 447 objects; an earlier run peaked at 453 objects. A production 4.2 km gate-guided continuous descent reached about 123 km/h, encountered all four themes and up to four hunters, earned gear, crossed ice and took a jump (87 flags, 3 misses in the last run before the guard-bank placement adjustment). Player protection isolated geometry/progression, so this is not human difficulty/survival evidence. VM simulation averaged ~5.44 ms/step, peak ~43.15 ms in that scene; no phone FPS claim. Separate pursuit scenes had a Yeti traverse and exit each town/ruins/glacier/tree corridor without retiring. A real owned Yeti caught the player inside a course town. Both alternative branches awarded exactly once with zero miss; a protected ordinary town still stopped a course hunter. The first town pursuit fixture incorrectly put the player beyond the retirement distance, then was corrected to maintain a 90 m lead; the ordinary-town fixture was also corrected to keep the regular run active rather than triggering finish retirement. Player/NPC ice ceilings and Yeti base×pace scaling matched at 0/1.2/2.4/5 km. A version-1 saved Endless record was archived under version 2 while retaining mock wallet and Arcade record values. Native live previews for all themes and the revised ruins art were visually inspected (ignored preview-endless-*-live.png). No automated suite or full human/phone playtest was run.

## 38. Long Endless sections, independent theme difficulty and persistent hunters — 2026-10-16

Latest user request: open up the routes to long turns and detours; improve ice, mountains and castles; make special sections five times longer; increase each theme's difficulty between appearances, not row by row; stop losing enemies just because the player gets far ahead. This supersedes section 37's short encounters and distance retirement.

`endless.encounters.lengthMetres` is now 900–1,200 before entry-speed scaling (formerly 180–240). There are five themes per shuffled bag: town, forest (`trees`), glacier (`ice`), castle (`ruins`) and new `mountains`. Names of existing families are retained; mountain names are High Pass / Snowcap Traverse / Split Summits. The first section remains a town. Repeated broad excursions and asymmetric rejoining detours replace the short single motif. `routeSwingMetres` 38–55 controls base excursion; staged examples span ~130–210 m horizontally. Geometry, gate opening and gate rhythm use the section's frozen difficulty/entry scale. Global player/owned-enemy pace still increases with distance.

Each theme has its own visit count, with difficulty `(visit - 1) / (difficultyVisits - 1)`, clamped to 0–1. Default difficultyVisits is 6. These parameters are fixed when the section is planned. Corridor widths use configured `[14.4, 23]` late/first base metres; glacier snow lanes taper only 23→20.16. Town crowds increase 2→5 residents per street row, with narrower streets. Towns now have many regular houses, shops, hotels, animated vendors/residents, lamps, bunting, snowy back lanes, playful props and some skiers. Forest wall rows tighten 7.5→5.4 m, banks deepen 14→21 m, turns grow five→six with sharper entries. Glaciers have broad irregular lakes with 3→1 snowy correction islands, increasing continuous ice length from 48→68% of each cycle and a longer dry-bank detour. Castle courtyards narrow into breaches; optional rubble/jump lines remain inside wide preparation areas. Mountain passes narrow and go from four→six switchback groups.

Scenery is generated only in approaching batches via populateEndlessEncounter, rather than creating every object for the entire kilometre. Town streets likewise stream in curved chunks sampled along the actual smooth path, with a direct segment tile rasterizer to avoid oversampling a complete long town. Old road chunks are pruned individually. Authored sections own their traffic and exclude ambient scenery across the whole y range, so wide detours do not run into unrelated ambient chunks. Special gates are clamped to local passage width. Off-piste arrows are suppressed in Endless. Fork scoring/reward grouping is retained.

Ice has frosted irregular banks, snowy islands, depth bands and fracture fans; glacier cliff faces have blue strata. Mountains use larger physical iceBlock footprints (320×220 base world units), sparse overlapping rows and code-native snow-capped crags with shaded folds, ledges, rock cracks and rounded shadows. Castle keeps add buttresses, inset snowy roofs, windows and occasional weathered pennants. Rejoining arches merge instead of overlapping. Standing castle walls and glacier/mountain cliffs now block airborne players; low rubble, trees, long trunks, falling trees and snowballs retain their existing jump clearance. Existing art scale and muted palette are preserved.

Awake Endless hunters no longer leave at a distance cutoff. `yetis.maxNearbyHunters` (4) and `nearbyMetres` (180, speed-scaled) now describe the local spawn budget, not a total-lifetime enemy cap: distant awake enemies keep physically pursuing and no longer suppress new nearby encounters. Dormant spawns still prune behind the radius. Wild Yetis/bears that wake during Endless and alerted wolves join the run; adopted wolves detach from ambient chunk ownership, remain active out of range, and survive scenery pruning. Defeat or run end still ends pursuit. No teleportation or catch-up speed was added. Loader/schema accept legacy maxActive / retireBehindMetres aliases. Hunters take the dry glacier route, use a short lane-width-dependent steering lookahead at bends, and retain old encounter route metadata while it is still needed. Normal town protection and Arcade settings remain unchanged. Endless recordVersion is 3; older records remain archived separately from wallet/Arcade records.

Verification: node syntax checks, strict schema/build and git diff checks passed; config comparison showed only the Endless section changed. Native production renders covered first/sixth-visit geometry for all five themes, plus final town/ice/castle/mountain visual passes. A shielded, route-guided continuous production descent reached 9.5 km and all five themes with seven awake pursuers, no finite finish, a peak of 819 objects and two retained encounter descriptors/four batches at the end. This was before final street rasterization/visual/collision refinements; average VM step was ~10.33 ms and peak ~84.22 ms, not a browser/phone FPS guarantee or human difficulty evidence. A separate fixture retained and moved a Yeti, bear and wolf with a lead exceeding 2.4 km; expiry was Infinity for the chasers. An initial long-route pursuit scene exposed poor cornering/insufficient progress in forest and glacier; shortening the waypoint lookahead resolved it. A subsequent physical pursuit scene traversed and exited all five themes without retirement; final glacier/mountain footprints were checked separately. Airborne contact scenes kept rocks, logs, falling trees and snowballs clear while full ruin walls/ice blocks caused falls. No automated suite or full human/phone playthrough was run. Scratch scenes and preview PNGs remain outside tracked source / ignored, respectively.

## 39. Clearer castle scale and town/castle flags — 2026-10-16

User reported oversized castle elements and too many confusing flags in castles/towns. Castle courtyard expansion is now at most 1.8× breach width (was 2.65×). Wall/tower art height caps at 76 world units, with a reduced tower multiplier; footprints remain unchanged. The oversized overhead ruin arch (whose vertical dimensions previously omitted zoom) is replaced with small broken lintel pillars rendered in consistent world/zoom units. Gateway span padding shrinks 132→48 base world units. Decorative tower pennants and Endless town street bunting are removed; ordinary village decoration is unchanged.

Town/castle scoring gates now appear only at each repeated route rejoin, as a single shared pair—five checkpoints per default section, instead of flag pairs all along both branches. The next scheduled gate snaps forward to the next rejoin, across generation batch boundaries, then resumes ordinary spacing outside the section. Forest/glacier/mountain gates are unchanged. Branches remain freely selectable. Entry messages explain the rejoin checkpoints. Sparse checkpoints alternate shield/sword; gearWeight scales their charge for the wider interval to preserve approximate full-combo supply per metre. The existing combo ramp and inventory caps still apply; all other gates use weight 1. Gate numbers/scoring count actual visible checkpoints, with no invisible misses.

Verification: JS syntax, validated build and diff checks passed. Native production renders inspected first/sixth town/castle layouts, including a gateway/rejoin view. Staged generation collected exactly five single-pair gates in each sampled town/castle (first/sixth visits), no street bunting, and confirmed generation/gates continued beyond the section without looping or skipping the final checkpoint. Screenshots are ignored preview-clear-*.png files; scratch renderer is /tmp/frostline-review/castle-town-clear-visuals.cjs. No automated suite or human playthrough was run. Source, generated HTML, README and CONFIG are updated; JSON tuning is unchanged.

## 40. One-row summit entrances — 2026-10-16

User requested moving the Endless entrance onto the same level as the other entries and pushing to GitHub. startMeadow now creates every race.entryChoices entry at y=450, in configured order (Endless at the left). Summit-only spacing/openings compact to keep all five gate pairs inside the portrait viewport without overlap; normal village entries retain their configured size. Summit Endless label is shortened to ENDLESS, its outdated NO TOWNS subtitle is replaced with DISTANCE RECORD, and Arcade uses a compact stage-count subtitle. Approach detail text appears only for the summit gate horizontally aligned with the player, avoiding overlapping instructions. README/CONFIG now describe the single row. JSON/mode settings are unchanged.

Verification: JS syntax, validated build and diff checks passed. Inspected native production summit render (ignored preview-summit-one-row.png): all five entries share y=450, their flag extents fit within approximately x=19–461 screen pixels, and each opening is separated from the next. No automated suite was added or run.
