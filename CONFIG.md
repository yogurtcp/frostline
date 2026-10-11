# Frostline configuration

Edit `game-config.json`. For local tuning, run `python3 serve.py` in this folder and open http://127.0.0.1:8765/. Every reload reads the JSON directly; no rebuild is needed for config edits. The hosted game also reads it on refresh.

Opening `index.html` through `file://` uses its embedded snapshot: browsers restrict reading adjacent local files. To update that standalone snapshot, run `python3 build.py`, then reload. Localhost and file URLs have separate browser saves (wallet and records); switching addresses does not transfer them. Code/schema edits still require a build.

Zero Yeti speed is allowed and means stationary. A nonzero count does not automatically assign a chase speed.

The file contains tuning data; collision algorithms, AI logic, pixel glyph shapes and renderer drawing instructions remain in JavaScript. Structural changes such as inventing a new object type still require code.

## Units and sections

World coordinates increase rightward and downhill. `world.unitsPerMetre` defaults to 10. Speeds are world units per second unless the property explicitly says `Kmh`. Durations are seconds. The HUD converts speed using `physics.hudKmhPerSpeed`. Ranges are `[minimum, maximum]`; probabilities are 0–1.

| Section | What it controls |
| --- | --- |
| `arcade` | 20 compact stage rows plus central knob tables, stage defaults/overrides, terrain, traffic, wolf-guard penalties and run-result duration |
| `courses` | Names, fees, lengths in metres, pace, gate spacing, obstacle density and type |
| `race` | Gate widths, required success fraction, point rewards, finish bonuses, choice rows and scenery placement |
| `mushroomHunt` | Mushroom count, required fraction, points, pickup size, spread, spacing clearances and glints in Spore Decisions |
| `timing` | Enable timing, maximum speed bonus, gold/par targets for each timed course, record revision and history length |
| `physics` | Acceleration, top speed, turning, walking, braking, ice, road slowdown, collisions and crash recovery |
| `controls` | Drag dead zone, drag scale, repeat interval and steering angle steps |
| `terrainFeatures` | Falling pine dimensions/timing, the paired log and jump bump, and rolling snowball dimensions, speeds, growth and lifetime |
| `jump` | Manual/ramp/mushroom/rainbow/hill airtime, takeoff speed multiplier (`speedBoost`), height scaling, spin, boosts and cooldown |
| `world` | Random seed, terrain density, chunk sizes, cleanup distance, course sway, ice sizes and predator frequency |
| `village` | House count, corridor offsets, layout randomization, building bands, footprints, path widths/routing, squares, walkers, pets, lift and entry positions |
| `villageLife` | `buildings` (hotel count/floors and mixed building variants), rabbit and rare fox visits, harmless prop cooldowns, animal curiosity/fleeing, NPC social timing and dialogue |
| `houseAnimation` | Chimney smoke, opening doors, roof snow, awning movement, window flicker and muted trim palettes |
| `wildlife` | Impact speed/angle thresholds, defeated-predator fade duration, pack sizes, detection distances, chase/flee speeds, predator meals, avoidance, rescue reactions, impact thresholds and cat behavior |
| `pedestrians` | Stroll radius, walking speeds and durations, pauses, obstacle clearance, spectator range and step animation |
| `skiers` | Traffic speeds/frequency, aggressive skier aiming and taunt cooldowns |
| `politePursuit` | Number and speed of the persistent course yetis (three, at 42% of straight-down top speed) |
| `chasers` | Pursuer speeds, ambush sizes, capture distances, and recurring patrol-wave duration, interval, steering and speech |
| `lift` | Cable location, chairs, towers, ride duration and speed |
| `spawnTables` | Weighted object pools; repeated entries increase their probability |
| `dialogue` | Taunts, fear, thanks, collision remarks, greetings and cheers |
| `render`, `colors`, `palette` | View scale, camera, sprite colors, UI durations and trail retention |
| `atlas` | Sprite rectangles: `[atlasName, sourceX, sourceY, width, height]` |
| `simulation` | Fixed simulation step and maximum frame interval; normally leave unchanged |

## Useful examples

- Arcade stage editor: `arcade.stages` maps names to knob tuples (`"Name": [obstacles, chase, miss, speed, ice]`, 1–4 each) in play order, with arbitrary names. Details resolve from `arcade.stageDefaults` plus per-name `arcade.stageOverrides` (gate count/swords, yeti color, two rarity-tier rates, overrides). Gate ice share comes from the ice knob. See `ARCADE.md` for a copyable pair and all keys.
- Arcade equipment: each stage’s `gates.swordGateCount` selects the number of sword gates. `arcade.gear.shieldsPerStage` controls shield yield, `swordGatesPerSword` controls sword charge, and `maxShields` / `maxSwords` cap inventory.
- Arcade item density: `arcade.itemTiers` assigns each of the 64 objects to `common`, `slightlyRare` or `veryRare`; the obstacle knob sets the `common` per-100m rate, each stage's `tierRates` sets the other two, and `itemRates` overrides single objects (0 disables; omission uses the tier/knob rate). `skier`, `fastSkier`, `boarder` and `overtakingSkier` are separate, and `endTrafficMultiplier` increases their density toward the finish. Other object densities stay constant. Safe gate openings and landing clearances can reduce actual placement.
- Make regular slalom timing more forgiving: increase `timing.targets.slalom.goldSeconds` and `parSeconds`, keeping gold below par.
- Reduce all speed prizes: lower `timing.maxBonus` (60 by default).
- Slow recovery: `physics.minimumCollisionKmh` (8) disables obstacle impacts only when BOTH you and the object are at or below that HUD speed in absolute terms. Creeping into a stationary dog is harmless, but a fast skier hitting a stopped player still crashes, and so does cruising into a same-speed boarder. Objects touched gently stay harmless until you fully clear them, even if you accelerate. Chasers (wolves, patrol) keep the old closing-speed rule, so outrunning them still counts as escaping.
- Bear/yeti impacts: `wildlife.bearKnockoutKmh` and `yetiKnockoutKmh` are 65/85; `bearMaxImpactAngleDegrees` and `yetiMaxImpactAngleDegrees` are 45/10. Speed alone cannot override the angle limit. Successful impacts kill the animal; it fades over `predatorFadeSeconds`.
- Make wolves easier to hit: lower `wildlife.wolfKillKmh` (30 by default; the actual impact must be faster than the threshold).
- Less harassment: lower `skiers.fastAimWeight`, increase `fastSpawnSeconds`, or lower `ambientFastChance` and `courseFastChance`.
- More houses: increase `village.houseCount`; if placement space runs out, also expand `halfWidth`, `rows`, or spacing. `corridorOffsets` provides the baseline horizontal route at each building band; randomization mirrors, reverses, shifts, scales and perturbs this pattern. Houses never overwrite roads or each other, so a very large requested count can be limited by available space.
- Different towns: `village.randomization` controls bend/width variation, row spacing, house counts and jitter, courtyard gaps, plaza count, and lift-station offsets. `enabled: true` and `seed: 0` generate fresh layouts each time a village is created; layouts stay fixed while you ski through them. A positive `seed` makes the layout sequence reproducible from the summit (resident activity remains independent). Set `enabled: false` for the original planned arrangement. Changes to row spacing automatically shift the town exit, lift, and course-choice row together.
- Town road surfaces: `village.mainRoadSurface` controls the main street and lift approach (`snow` by default, or `paved`). `snowRoadColors` contains the bank, packed-snow, highlight and track colors. Snow takes precedence over paving where routes cross.
- Longer village: expand its row layout and move `stationY`, `roadEndY`, `choiceTitleY`, `choiceY`, and `endOffset` down together. Keep the choice row below the houses and the village end below the choices.
- Ski-patrol punishment: `chasers.ambushCount.patrol` is 4. `chasers.patrolWaves.durationSeconds` is 120 and `intervalSeconds` is 5. The same section controls overtaking speed, lateral steering, lane spacing, pass lifetime and speech timing. `dialogue.patrolTaunts` contains the unpaid-ticket heckles. Course exits and finishes do not cancel waves.
- Fewer wolf encounters: lower `world.wolfShareOfPredators`, increase `wildlife.packSpawnSeparation`, or reduce `wildlife.packLimit`. Packs retain their configured 3–4 members.
- Fewer rabbits: remove rabbit entries from `spawnTables.human` / `wild` or add more copies of other objects.
- Preserve comparable best times after a substantial change: increment `timing.recordVersion`. Wallets remain intact.

Saved data uses the browser's `frostline-v2` local-storage key. `times[courseId]` contains the personal best, last attempt, and bounded attempt history; each history item has time, gate or mushroom results, crashes, payment status, speed bonus, date, and rules signature. Failed/unpaid attempts are recorded but never become qualifying best times.

Local-file and hosted versions have separate browser storage origins. Publishing does not move the offline wallet or records to the hosted site.



Arcade starts: `startStage` is 1-based; `autoStart: true` loads directly above that stage’s start. Starts above 1 are practice and do not overwrite records. start-line yetis and penalty wolves resolve from the stage's `knobs` via `arcade.knobLevels` (counts, chase speed as percent of top, guarded-gate share); no other automatic speed calculation applies.

New Arcade item keys: `fallingTree`, `logJump`, `rollingSnowball` (all `slightlyRare`). Set a per-stage `itemRates` value to control each, including `0` to disable. `terrainFeatures.logJump.widthMetres` is 100 (20× the initial version), `bumpWidthMetres` is independently 15 (3×), and `heightMetres` controls visual thickness; the bump is spawned with the log and is not a separate rate. The old `snowball` stays stationary.

Rolling snowballs use `triggerDistanceMetres` as an arming range and time their warning/release from the skier's current velocity. They wait for a downhill skier and keep a fixed path after release. `downhillSpeedKmh` is the terminal downhill-speed baseline; the downward speed can adjust once at release to the projected crossing, capped at 125% of that setting. `lateralSpeedKmh` caps the side-to-side speed.

Falling pines rotate sideways with an animated collision capsule; `fallenRadiusMetres` controls its radius. Jumping clears the log, rotating/fallen pine, and rolling snowball. Snowballs have a 240 m arming range and 270 m travel limit. Their terminal downhill speed, acceleration time, initial speed fraction, sinusoidal sway amplitude/period, and trail lifetime are separately editable under `terrainFeatures.rollingSnowball`. Solid scenery causes a fading breakup animation; the trail persists afterward. See `ARCADE.md` for the release timing and speed cap.

Bear pursuit uses explicit world-unit tuning in `wildlife`: `bearChaseSpeed: 150` is 30 km/h downhill with the default HUD conversion; `bearChaseDistance: 10000` gives wild bears 1000 m of skier downhill travel before expiry. `bearWakeDistance: 340` is a 34 m activation radius, and `bearRoamSpeed: 40` is an 8 km/h four-legged walk. Course-owned bears still pursue until their run ends. The legacy `chasers.speedRatios.bear` field is retained for config compatibility but no longer controls bear helper spawns; all bear chases use `wildlife.bearChaseSpeed`. Course exits/off-piste notices and dog/patrol bumps do not shorten unrelated bear chases. Existing town, safe-approach and protected-piste rules remain active.

Enemy pursuit uses `predators.offDownhillSpeedRatio: 0.5`: horizontal X velocity and uphill Y velocity are halved, while downhill Y stays at its configured value. Applies to bears, yetis, hunting wolves, pursuing dogs and ski patrol, including avoidance turns. At a diagonal, X is halved independently of downhill Y. Ordinary wandering animals, friendly skiers and player physics keep their existing movement.

NPC prey selection checks `predators.divertChance` every `divertRecheckSeconds` (1.5 s) only while a yeti, bear or wolf has no committed NPC target. A selected target stays locked; the 8 s `divertTimeoutSeconds` now measures lack of progress rather than total hunt duration. Closing the best gap by at least one world unit (0.1 m) refreshes it. Eaten/dead targets are released immediately. Prey must initially be within 5 m and nearer the player than the hunter. Foxes, wolves, bears and yetis are excluded as prey.

Skier/snowboarder fear uses `wildlife.npcFearDistance` (310 world units / 31 m), `npcFearSeconds`, `npcFleeSpeed`, `npcFleeLateralSpeed` and `npcSpeechCooldown` for wolves, bears and awake Yetis. The nearest eligible enemy drives fleeing; towns/protected pistes suppress ordinary threats, while course-owned pursuers can frighten NPCs on their own piste. Dead, stunned, retiring, sleeping and waiting enemies are excluded. `dialogue.terrified` contains wolf warnings; `bearTerrified` and `yetiTerrified` supply the other warnings.
