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
