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

| Field | Earlier campaign default | Current published setting |
| --- | ---: | ---: |
| `arcade.startStage` | 1 | 2 |
| `arcade.autoStart` | false | true |
| `arcade.stages[0].yeti.count` | 0 | 4 |

Stage 1's `yeti.speedKmh` remains **0**, so those four yetis are stationary. Zero speed is explicitly permitted. Starting at stage 2 means stage 1 will not be seen in that practice run. Do not silently restore the earlier defaults.

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

Some older prose can lag behind newer mechanics. In particular, the final **Gear, towns and records** section of `ARCADE.md` describes the old eight-gate sword/full-stage shield rate without qualifying the new combo ramp. Its newer **Gate combos and gear** section and current code give the correct formula. Numeric tuning in prose is secondary to the current JSON.

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
- Jumps lock heading and speed at takeoff. No steering in midair. Higher-speed jumps gain height/airtime.
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
- Yeti/bear high-speed knockout thresholds already exist. Inspect current config and collision logic before changing them; the desired distinction is near-straight full-speed Yeti hits versus easier bear knockouts.

## 6. Modes, rewards and failure behavior

### Regular courses

Regular mode has a persistent wallet, paid courses, timing and qualifying rewards. Most gate courses require at least 90% correct gates plus the finish crossing. Unpaid entries award no money or qualifying best time and can trigger yetis, persistent dog pursuit, or repeated ski-patrol waves. Ski patrol is intentionally prolonged rather than a single group stuck beside the player.

Classic `slalom` is gates and people in its corridor; other terrain stays outside. `Spore Decisions` is mushroom collection, not another gate slalom. Ordinary world mushrooms retain their old behavior; collectible course mushrooms are a separate case. Regular `Polite Pursuit` uses `politePursuit` settings, distinct from the similarly named Arcade stage.

Timing begins at the actual start line. A qualifying fast finish gains a bounded time bonus. Saved bests include a signature of relevant rules so incompatible times are not treated as comparable. See `creditRun`, `timingSignature` and `timing` config.

### Arcade

- Physical Arcade entrance starts a named, ordered survival campaign, currently 12 configurable stages.
- No entry fees, money rewards, or time-based qualification. Creatures create urgency.
- Towns connect stages automatically; no course selection between stages.
- **Missing the finish fails Arcade in place. Do not teleport or reset the world.** The player can continue skiing normally.
- Missing ordinary gates does not itself invoke the regular 90% failure rule. It breaks the combo and may release configured yetis.
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
- Sword full-rate charge is 1 unit. Sword threshold is `arcade.gear.swordGatesPerSword` (currently 8 full-rate units, equivalent to 24 new points).
- Shield full-rate charge is `shieldsPerStage / ordinaryGateCount` (currently a 1.5-shield stage budget before combo ramp losses).
- Inventory and partial charges persist across towns. So does the combo until a miss. New attempts start empty.
- Even a correct gate whose inventory is full advances the shared combo, but awards no stored charge.
- Gate labels and the top CHAIN indicator use three text weights/colors. Top inventory icons fill gradually and brighten when ready.
- Shields automatically protect from qualifying obstacles outside towns. Swords automatically defeat qualifying animal threats. See the exclusion/eligibility guards rather than assuming every collision spends gear.

## 7. Stage config: explicit tuning, no hidden balancing

The user wants direct control. **Do not introduce automatic Yeti speed math or retune player speed/gate spacing in response to a chase complaint without explicit agreement.**

The previous attempt to make the first Yeti stages faster was rejected and reverted. Stages 3–4 were restored to normal 103 km/h and 30 m vertical gate spacing. Absolute Yeti speeds then became editable per stage.

Each `arcade.stages[]` entry has:

| Setting | Meaning |
| --- | --- |
| `name` | Display name; array position supplies stage number |
| `topSpeedKmh` | Stage player top speed |
| `gates.count` | Total gate count, including sword gates |
| `gates.horizontalDistanceMetres` | Distance between alternate gate centres, not offset from centreline |
| `gates.verticalDistanceMetres` | Downhill gate spacing |
| `gates.openingWidthMetres` | Full opening width |
| `gates.firstGateMetres` | Start-to-first-gate distance |
| `gates.finishAfterLastGateMetres` | Last-gate-to-finish distance |
| `gates.swordGateCount` | Exact number distributed across the course |
| `gates.icePercent` | 0–100 percent of gates covered by ice, rounded to a whole gate count |
| `yeti` | Start group: independent count, color and absolute speedKmh |
| `missedGateYetis` | Per-miss releases: independent count, color and speedKmh |
| `tierRates` / `itemRates` | Per-tier default spawn rates plus optional per-object overrides (tiers defined once in global `arcade.itemTiers`) |
| `itemSpreadMetres` | Horizontal placement range about centreline |
| `endTrafficMultiplier` | Gradual increase in skier/boarder density toward finish |

Course length is first gate distance + `(count − 1) × vertical spacing` + finish offset. Horizontal gate centres alternate at plus/minus half the configured horizontal distance. No extra Arcade gate sway is added.

Yeti colors teal/orange/violet map to internal slow/fast/elite visual tiers. Speeds are absolute and independent of color. Zero count disables a group; zero speed makes it stationary. Waiting start-line yetis wake when the start is crossed. Pursuers belong to their run and have no distance leash; retire at its end. Sleeping Yeti item entries use the stage's `yeti.speedKmh`.

Global `arcade.itemTiers` maps each of the 59 catalog keys (listed in `ARCADE.md` and `ARCADE_ITEMS` in `game.js`) to `common`, `slightlyRare` or `veryRare`. Each stage's `tierRates` sets the per-100m default for each tier; `itemRates` overrides single objects, with explicit `0` disabling one and omission using the tier rate. Rates are placement attempts, not guaranteed exact counts: collision, gate and landing clearances can reject a placement. `wolfPack` counts packs; `wolf` counts individuals. Town/ambient scenery has separate settings. Do not add a hidden background spawn stream inside Arcade that defeats these controls.

Gate ice is separate from randomly placed `smallLake` and `largeLake`. At handover, stages 8 and 12 use 25% gate ice; others use 0%. Selected gates vary per run. Their patches span the opening and intentionally bypass the ordinary gate-clearance restriction for lakes.

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

The user reported slowdown near stage transitions and then explicitly said it was no longer occurring and to ignore it. There is **no active performance-investigation task**. Do not resume broad profiling/refactoring unless requested.

No new gameplay request is pending in this handover; wait for the user's next specific edit. Keep the guide updated when mechanics or workflow materially change.

## 11. Practical delivery discipline

- Preserve local config and saves. Stage named files deliberately.
- Keep fixes focused; do not rewrite the engine or replace the established art to simplify a task.
- Rebuild `index.html` with source changes and commit the intended embedded config, not accidental practice overrides.
- Prefix the incoming model's commits with `[muse]`.
- Standing publishing authorization: push completed new versions to `main` without reconfirmation. This is an experimental project and the user accepts reverting unwanted versions. A push publishes through Pages; do not claim the deployment is already live merely because the push succeeded.
- Give concise progress updates and a final summary of changes, checks actually performed, and any unresolved issue.
- If a requested result is ambiguous, inspect existing code/context first. Ask only the missing question that matters; do not repeatedly ask permission for routine authorized edits.
