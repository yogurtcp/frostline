# Arcade stage editor

## Rollback and design intent

The gate-pace pursuit calculation remains removed. Stage speeds and gate geometry resolve from the explicit knob tables, with an optional Yeti-speed override for a special stage; there are no calculated chase-speed caps or automatic catch-up adjustments.

There are 27 stages, editable in order, linked into continuous slopes of three stages by default. Safe towns follow stages 3, 6, 9, 12, 15, 18, 21 and 24; the final slope, stages 25–27, ends the campaign. Warmup introduces gates and light traffic; Denser Forest introduces one slow Yeti across a clear opening before the forest begins. Later special stages mix dense traffic, slippery lakes, and forest pursuit. No menus. Missing a slope's finish fails Arcade in place; death returns to the summit.

## Quick start

Edit `game-config.json`, at the top under `arcade`.

```json
"startStage": 8,
"autoStart": true
```

This loads you just above stage 8’s start line, waiting for your input. Death/reset starts there again. `autoStart: false` keeps the summit; the Arcade entrance still uses `startStage`. Set `startStage: 1` for a complete run. Starts above 1 are visibly marked PRACTICE and do not overwrite the full-run record. Completion is based on reaching the last configured stage, including in practice.

For live local tuning, run `python3 serve.py`, open http://127.0.0.1:8765/, then edit JSON and reload. For standalone `file://` play, run `python3 build.py` from this folder after editing, then reload `index.html`. Hosted play reads the JSON on refresh. Validation reports unknown item names, out-of-range values, an invalid start stage, or more sword gates than total gates.

## Add or edit a stage

Add one row per stage to `arcade.stages`: `"Name": [obstacles, chase, miss, speed, ice]`, levels 1–4. Map order defines progression; there is no fixed stage count or hardcoded name list. Details resolve from `arcade.stageDefaults` plus `arcade.stageOverrides` (same field names as before, partial, keyed by stage name; unknown names fail validation). A compact pair looks like this (objects missing from `itemRates` use their knob or tier rate):

```json
{
"stages": {
  "Warmup": [1, 1, 1, 1, 1],
  "My snowy disaster": [2, 2, 2, 2, 2]
},
"stageOverrides": {
  "My snowy disaster": {
    "yetiColor": "teal",
    "gates": { "count": 18 },
    "tierRates": { "slightlyRare": 0.3 },
    "itemRates": { "pine": 2, "skier": 3, "rock": 0 }
  }
}
```

Here `My snowy disaster` runs knobs [2,2,2,2,2] with 18 gates, teal yetis, slightlyRare 0.3, and `pine`/`skier`/`rock` item overrides; everything else comes from `stageDefaults`. `Warmup` runs pure defaults. Level meanings live in `arcade.knobLevels`.

### Link stages and place towns

`arcade.stageFlow` defines the default cadence; a named stage's optional `townAfter` override controls its own boundary:

```json
"stageFlow": {
  "townEveryStages": 3,
  "linkedStageGapMetres": 0
},
"stageOverrides": {
  "Monster": { "townAfter": false },
  "Rush Hour": { "townAfter": true }
}
```

Merge these fields into existing overrides. This example skips the usual stage-3 town and places one after Rush Hour (4), making stages 1–4 one slope. The numbered cadence remains anchored to the campaign: the next default town is after stage 6. `townAfter: true` forces a town; `false` links to the next stage; omission uses the cadence. Set `townEveryStages: 1` to restore a town after every stage. For entirely named boundaries, use a cadence larger than the stage count and set `townAfter: true` only on your chosen stages. The last stage always ends the campaign, regardless of its override.

At linked boundaries the stage name/HUD changes while skiing continues. There are no internal finish gates, start stripes, spectators or result panels. Gate numbers restart for the new stage; gate charges, combo, jumps, heading and speed carry across. Two half-spacing run-outs maintain ordinary gate spacing at a join; `linkedStageGapMetres` adds extra snow distance if desired. The first slope approach and final finish run-out retain their ordinary geometry. Momentum also extends its authored jump corridors. A group is prepared before it enters view, including future waiting start-line Yetis, so objects do not pop in at boundaries.

Surviving Yetis, bears and awake wolves remain part of the connected slope and can accumulate through later stages, keeping their own chase speeds and prey/obstacle behavior. Each stage still introduces its configured monsters; waiting Yetis wake when their own stage starts. A town finish retires the whole slope's monsters, including sleeping ones, and remains a safe intermission. Starting practice midway through a group continues only to its next configured town.

### Gates

- `count`: exact total number of gates, including sword gates.
- `swordGateCount`: exact number of sword gates, distributed along the course. Zero disables them; all gates can be sword gates if desired.

For ordinary stages, geometry (horizontal/vertical distance, opening, first-gate and finish run-outs) derives from the speed knob: each is a fixed percentage of the stage top speed from `arcade.knobLevels.gateSpacing`. Centres alternate at plus/minus half the derived horizontal distance. There is no added course sway.

Ordinary course length is the derived first run-out + `(count − 1) × derived vertical spacing` + derived finish run-out. Momentum sums the actual leg lengths, including its extended jump corridors. Linked stage ends/starts replace their run-outs with half the local gate spacing (plus any configured link gap on the next stage's start). Changing count moves later stages and the slope's following town together. Only a town boundary or the campaign's end has finish flags; their opening still uses the global `race.finishWidthMultiplier` (2).

The ice knob sets the share of gates with ice spanning the opening from `knobLevels.iceGatePercent` (rounded to whole gates, level 1 is none). Selected gates vary each run. These patches are independent of `smallLake`/`largeLake` density; use zero for both if you only want gate ice.

Design guideline: ordinary stages share gate geometry for a given speed — faster stages get more spread-out gates (larger vertical distance and wider openings) so reaction time stays fair. jumpLine remains available for custom straight-gate jump stages; momentum keeps alternating slalom gates and occasional gate-versus-jump choices, with landing room for its locked-heading flights.

### Gate combos and gear

All correct gates share one streak, regardless of shield/sword type. They award 1, then 2, then 3 points per gate; missing a gate resets the streak. Three points equal the previous full gate charge (one sword-gate unit or `shieldsPerStage / ordinaryGateCount` shield charge). Thus the first two gates charge at one-third and two-thirds speed. `swordGatesPerSword` still counts full-charge equivalents. The streak carries through towns and continues even when an inventory is full, but full inventories gain no charge.

Gate labels show each gate's contribution as a share of one full item (`+14% SHIELD`, `+25% SWORD`): the streak points scaled by that stage's per-gate charge, so the number always reads as progress toward a full shield or sword. Label color and weight still encode the streak tier (1/2/3), and labels fade out ~2.5 s after you pass. There is no top CHAIN indicator. Shields are not consumed in towns or their safe approach paths. Death/new Arcade run resets the streak.

### Yetis

The chase knob sets the waiting start-line group from `knobLevels.chaseCount` and `chaseSpeedPercent` (percent of stage top); `yetiColor` (teal/orange/violet/magenta) paints it. The miss knob arms that share of gates (`knobLevels.missGatePercent`, rounded) with `knobLevels.missWolves` sleeping wolves each, marked with a red `!`; they wake at the chase speed when their gate is missed. Clearing an armed gate leaves its wolves asleep. Bumping one wakes it. Colors select visual tiers only, shown through the body tint without a hovering bar/scarf. Zero count/percent disables the group. No gate-pace calculation, catch-up boost, or hidden color-speed multiplier applies.

Start-line yetis remain visible before their stage, react when you cross its boundary, and chase after `arcade.wakeSeconds`. Pursuers follow off piste and across linked stages, retiring at the connected slope's town finish. The separately placed sleeping yeti items use their named color and the stage’s knob-derived chase speed, even if its start-line count is zero.

### Item density

The obstacle knob sets the `common` spawn rate from `knobLevels.obstacles`; each stage sets `slightlyRare`/`veryRare` in `tierRates`, in placement attempts per 100 m of course. Every catalog object spawns at its tier’s rate unless that stage lists it in `itemRates` with an explicit number; `0` disables the object. Omit `itemRates` keys — or the whole object — to run on tier defaults. The tier of each object lives in the single global map `arcade.itemTiers`. There are no random mixed item tables, automatic tree substitutions, mandatory terrain features, or hidden Arcade overtaker timers.

Densities are placement attempts, not exact counts: gates, finish openings, lakes, other objects and jump landing zones remain clear. `itemSpreadMetres` controls how far from the centreline items can be placed (default ±55 m, covering the flanks out to the cleared band so skirting the course still meets forest). Placement counts scale with spread against the 32 m reference the knob densities were tuned at, so widening the band holds per-area density instead of thinning the middle. Rare rates may yield no objects on a short stage. Towns, finish spectators, structural start/finish flags, the connecting lift cable and off-piste scenery retain their separate existing config sections; they are not counted as course item spawns.

`endTrafficMultiplier` scales the four skier/boarder entries gradually from 1× at the start to the configured finish multiplier. Set it to 1 for constant density. Overtakers are scheduled by distance along the course: passing their hidden trigger brings a fast skier from uphill. Ahead-of-player `fastSkier` traffic remains catchable, as before.

| Group | Individual keys |
| --- | --- |
| Trees | `pine`, `fir`, `smallPine`, `spruceTree`, `crookedTree`, `cedarTree`, `alpineTree` |
| Obstacles | `rock`, `pebble`, `stump`, `bush`, `mushroom`, `sled`, `snowball`, `fallingTree`, `logJump`, `rollingSnowball` |
| Jumps and surfaces | `ramp`, `mogul`, `rainbow`, `smallHill`, `largeHill`, `smallLake`, `largeLake`, `rugged`, `snowPath`, `pavedPath` |
| Skiers | `skier`, `fastSkier`, `overtakingSkier`, `boarder` |
| Pedestrians | `personRed`, `personYellow`, `personGreen` |
| Animals | `dog`, `cat`, `rabbit`, `fox`, `wolf`, `wolfPack`, `bear` |
| Sleeping yetis | `yetiTeal`, `yetiOrange`, `yetiViolet` |
| Buildings | `lodge`, `rental`, `cottage`, `chalet`, `inn`, `cafe`, `hotel`, `skiShop` |
| Props | `lamp`, `bench`, `snowman`, `bunting`, `powderPile`, `pigeons`, `breadStand`, `skiRack`, `lift`, `sign`, `flag`, `star` |

| Tier | Members |
| --- | --- |
| `common` | pine, fir, smallPine, spruceTree, crookedTree, cedarTree, alpineTree, rock, pebble, stump, bush, skier, boarder, personRed, personYellow, personGreen |
| `slightlyRare` | ramp, mogul, rainbow, smallHill, largeHill, mushroom, sled, snowball, fastSkier, overtakingSkier, dog, cat, rabbit, fox, rugged, lamp, bench, snowman, sign, flag, star, snowPath, pavedPath, bunting, powderPile, pigeons, skiRack, breadStand, fallingTree, logJump, rollingSnowball |
| `veryRare` | smallLake, largeLake, wolf, bear, wolfPack, yetiTeal, yetiOrange, yetiViolet, lodge, rental, cottage, chalet, inn, cafe, hotel, skiShop, lift |

`wolf` counts individuals; `wolfPack` counts packs of the configured 3–4 wolves. Explicitly placed course predators can chase/hunt on the piste; protected towns remain safe. House variants share existing collision footprints. `star`, `sign`, and the standalone `flag` are decorative, not currency or extra scoring gates. The stage `lift` is a prop during Arcade; it cannot exit the run. Animation poses (running/left/falling sprites), UI icons, and labels are not separate gameplay items. Courses are forest: buildings, props, decor and paths never scatter there via tier rates (they stay in `itemTiers` for future village scatter); only an explicit per-stage `itemRates` pin places one on a course. Hills are SkiFree-style contour jumps: `smallHill` launches briefly, `largeHill` is the biggest air in the game. `rugged` is scruffy ground that caps speed at half while you cross it.

## Current defaults

| # | Name | Knobs O/C/M/S/I | Top | Chase | Guarded | Ice |
| --- | --- | ---: | ---: | --- | --- | ---: |
| 1 | Warmup | 11111 | 90 | none | 0% | 0% |
| 2 | Denser Forest | 22111 | 90 | 1 teal @45 | 0% | 0% |
| 3 | Monster | 22111 | 90 | 1 teal @45 | 0% | 0% |
| 4 | Rush Hour | 13111 | 90 | 2 orange @63 | 0% | 0% |
| 5 | Miss and Be Eaten | 22211 | 90 | 1 teal @45 | 25% | 0% |
| 6 | Aim Before Ice | 11111 | 90 | none | 0% | 0% |
| 7 | Fast Monster | 13111 | 90 | 2 orange @63 | 0% | 0% |
| 8 | 2 Fast 2 Forest | 23111 | 90 | 2 orange @63 | 0% | 0% |
| 9 | Keep Your Momentum | 14111 | 90 | 3 magenta @92 | 0% | 0% |
| 10 | Timber! | 12111 | 90 | 1 orange @45 | 0% | 0% |
| 11 | Dense Chase | 33122 | 105 | 2 violet @73.5 | 0% | 25% |
| 12 | Snowball Run | 13121 | 105 | 2 orange @73.5 | 0% | 0% |
| 13 | Here We Go | 12131 | 120 | 1 orange @60 | 0% | 0% |
| 14 | Faster, Careful | 22232 | 120 | 1 orange @60 | 25% | 25% |
| 15 | My God | 23333 | 120 | 2 orange @84 | 50% | 50% |
| 16 | Oh No | 33333 | 120 | 2 orange @84 | 50% | 50% |
| 17 | Darkest Spots | 41112 | 90 | none | 0% | 25% |
| 18 | Darker and Darker | 42113 | 90 | 1 violet @45 | 0% | 50% |
| 19 | Almost There | 43113 | 90 | 2 violet @63 | 0% | 50% |
| 20 | Good Luck | 14114 | 90 | 3 violet @81 | 0% | 100% |
| 21 | Too Fast | 11141 | 150 | none | 0% | 0% |
| 22 | Don't Miss | 11411 | 90 | none | 100% | 0% |
| 23 | Nowhere to Hide | 34111 | 90 | 3 orange @81 | 0% | 0% |
| 24 | Black Ice | 11134 | 120 | none | 0% | 100% |
| 25 | No Room for Error | 22442 | 150 | 1 orange @75 | 100% | 25% |
| 26 | Everything Hurts | 34333 | 120 | 3 orange @108 | 50% | 50% |
| 27 | You Asked For This | 44444 | 150 | 3 orange @135 | 100% | 100% |

Knobs read `[obstacles, chase, miss, speed, ice]`, levels 1–4. The Ice column counts dedicated gate-ice patches; lake layouts and lake item rates are separate. Chase shows resolved count, color and km/h; guarded shows the share of gates with a 3-wolf pack; ice shows the share of gates with a frozen patch. Common rate per obstacle level lives in `knobLevels`. Existing stages retain their relative order; five named special stages interrupt the progression.

### Concept progression

| Concept | First introduction | Later pressure |
| --- | --- | --- |
| Gates and traffic | 1, Warmup: light traffic, no enemies | 4, Rush Hour: crowded traffic and two Yetis |
| Yeti pursuit | 2, Denser Forest: one teal Yeti at 45 km/h, clear first three gates | 3, Monster; then multiple/faster chases |
| Jumping | The initial control hint explains manual jumping; ordinary hills launch on contact | 9, Keep Your Momentum: large hills/rainbows with boosted flights and sparse rough snow |
| Missed-gate wolves | 5, Miss and Be Eaten: marked sleeping wolves, only 25% of gates guarded | Later stages raise the guarded share |
| Ice steering lock | 6, Aim Before Ice: irregular large lakes, slippery skier traffic and shoreline ambushes | 11 and later icy chases |

Random logs remain disabled before Dense Chase (11); falling trees and rolling balls are disabled before Timber! (10) and Snowball Run (12). Those two hazards retain their focused introductions. Air Time and Darker Woods, Icy Lakes have been removed: Momentum now provides the big-jump challenge, while Aim Before Ice already introduces large lakes and slippery skier traffic. The restrictions are ordinary stage rates, not global unlocks.

## Special stages

| # | Name | Focus |
| --- | --- | --- |
| 4 | Rush Hour | 40 gates / about 1,365 m of dense weaving skier traffic, overtakers and two Yetis that can divert to NPC prey. |
| 6 | Aim Before Ice | 24 gates, irregular large lakes, sliding NPCs and wolves/Yetis waiting on the far banks. |
| 9 | Keep Your Momentum | 40 gates, seven large hills, six rainbow jumps and three small slowdown patches. Slalom gates keep alternating; four jumps compete with the next gate for a gear-versus-speed choice; three magenta Yetis at the user’s 92 km/h versus a 90 km/h player top, with four seconds to get ready. |
| 10 | Timber! | Seventeen alternating-side falling trees, sparse ordinary trees and one Yeti. |
| 12 | Snowball Run | Ten alternating-side rolling balls, a few trees/hills and two Yetis. |

These names are ordinary entries in `arcade.stages`. Move their rows to insert them elsewhere; keep the matching `stageOverrides` keys. Set `startStage` to the current row number to try one directly. The campaign revision is now 8, archiving earlier records after removing Air Time and Darker Woods, Icy Lakes. Stages 1–9 retain their numbers; Timber!, Dense Chase and Snowball Run are now 10–12.

New optional fields in a stage override:

- `specialLayout`: `none` (default), `yetiIntro`, `jumpLine`, `momentum`, `iceIslands`, `iceChaos`, `snowballs`, or `timber`. These reusable arrangements do not depend on stage names. `yetiIntro` clears the route through the first three gates before ordinary forest/traffic begins; it does not set the Yeti count or speed. Encounter counts follow gate count; jump spacing also allows room for flight and landing. Authored encounters are independent of `itemRates`, which add surrounding scenery/traffic. Set the layout to `none` to remove the arrangement.
- `briefing`: a short instruction shown at the stage start.
- `yetiSpeedPercent`: explicit Yeti chase speed as a percentage of the stage top speed. Omission uses the chase knob. Aim Before Ice uses 70% for its shoreline Yetis (63 km/h); its start-line count remains zero. Guard wolves still use the normal chase knob speed.
- `yetiSpeedKmh`: exact Yeti chase speed in HUD km/h, taking precedence over `yetiSpeedPercent`. Keep Your Momentum currently uses the user’s 92 km/h with speed knob 1 (player top 90 km/h).
- `yetiWakeSeconds`: stage start-line adjustment time; omission uses global `arcade.wakeSeconds` (0.8 s). Keep Your Momentum uses 4 s. Earlier linked-stage pursuers continue at their own speeds; only the newly introduced Yetis wait.
- `yetiColor`: `teal`, `orange`, `violet`, or `magenta`; magenta maps to the distinct `special` tint in `arcade.yetiColors`/`yetiTints`. Waiting, chasing, celebration and knocked-out poses retain their color.
- `townAfter`: optional town boundary override; see Link stages and place towns above.

`jumpLine` uses straight gates because its long airborne heading is locked. The reusable jumpLine layout puts barriers between gates with hills 18 m uphill and reserved approach/landing space, alternating 100 m logs and five-tree rows; no current campaign stage uses it. `momentum` keeps every gate alternating, including at jump encounters. Each three-gap section selects a varying launch gap; the hill/rainbow mix is shuffled and takeoff locations vary. At 40 gates, it has seven large hills, six rainbows, three rough patches and four interior jump-versus-gate choices. Those four jumps sit late on the previous gate's outer side, opposite the next gate: keeping the gate preserves combo/gear, while taking the jump gives escape speed and rejoins at the following gate. Ordinary jumps are offset but can be aimed through the next gate. Big jumps retain boosted flight; risky branches have a landing limit before the next turn (roughly 1.4–1.6 s in staged samples). Flight/landing clearings protect the intended branch without lining up gate pairs. Extended gap lengths and the current practice length of about 2,698 m remain. Surrounding forest/traffic stays configured through itemRates; rough slowdown does not apply in the air. Keep Your Momentum is stage 9, after Fast Monster and 2 Fast 2 Forest. The optional iceIslands layout still offers short practice patches. Aim Before Ice now uses iceChaos: randomly sized/offset lakes, three NPCs on each approach and a wolf/Yeti on the snowy far bank. Lake diameters range 44–68 m across and 44–62 m downhill before shape variation. NPC skiers and boarders coast with locked entry heading and the same downhill acceleration as the player; snow restores steering. Shore predators stay off ice and wait while their target is on ice, then pursue on snow. Snowball and timber layouts retain slalom gates and alternate which side of the route their encounters start on. Normal stages still use their existing placement rules.

## Gear, towns and records

Ordinary successful gates provide 1.5 shield charges per fully cleared stage; four successful sword gates earn one sword. These global amounts remain in `arcade.gear`. Charge and up to four of each item carry through towns. An attempt starts empty. If every gate is a sword gate, that stage awards no shield charge. Touching an enemy (bear, sleeping yeti, wolf) slows you down instead of crashing you, and spends no sword or shield; ramming one dead at speed keeps that clean kill, and sleeping yetis die on any touch above a creep. Dogs and people still knock you down (shields apply). Chaser catches and wolf attacks stay lethal, with swords working as before.

Towns are safe intermissions after configured groups; the next group starts automatically at their exit. Internal stage boundaries advance by downhill distance, including off piste, and keep the player and monsters moving. Crossing outside a group's actual finish flags fails Arcade without teleporting; death returns to the summit (or the configured automatic start). Completing the final configured stage ends the run.

`frostline-v2` browser storage keeps wallet, regular-course times and Arcade records. Practice starts do not update Arcade records. `campaignVersion` can be incremented after a substantial redesign to retain the previous record separately. Refresh starts a new attempt rather than resuming one.

## Interactive slope features

Three new catalog entries use `slightlyRare` rates, with the normal per-stage `itemRates` overrides. Later stages inherit their configured rare rates. Warmup's zero rare rate keeps these features out of level one; the temporary hardcoded log/tree/ball encounters have been removed. There is no separate ambient spawn stream for these features.

- `fallingTree`: a tall pine that creaks and shakes when the skier approaches, then rotates rigidly 90° sideways around its base. Trees beside the gate route fall across that route; farther trees fall toward the skier's side. Its size stays fixed throughout. The collision capsule follows the rotating trunk and branches (3 m radius), and remains active after landing. Grounded skiers can hit it; airborne skiers clear it. Predators route around it and can be knocked down during the fall or landing.
- `logJump`: one 100-metre horizontal log (20× its original length), centered on the route between gates, with an independently sized 15-metre snow bump (3× its original width) sharing its midpoint 4.5 m uphill. Occupied placements retry neighbouring gate gaps while keeping the midpoint on the route. Crossing the bump downhill at skiing speed launches a locked-heading hop with enough airtime to clear the trunk. Yetis, wolves and bears use its full horizontal footprint, commit to two waypoints around one end, then resume pursuit. Walking across the bump does not launch.
- `rollingSnowball`: waits until the skier’s position, direction and speed predict an interception along its accelerating curve. It shakes for at least the warning duration, starts at 15% speed, then accelerates downhill while weaving from side to side. The whole path is fixed at release, so steering or jumping can evade it. Rotation, powder and a compacted snow trail make its movement visible; the trail lasts 8 seconds. It grows from a 2 m radius to at most 3 m and rolls for up to 270 m (3× the original range). Contact with solid scenery or predators, the range limit, or a protected town approach breaks it into fading snow chunks. Jumping clears it without collision side effects; grounded contact can cause a shield-protected fall.

Log length, drawn height and bump width are independent. Bark repeats across the long trunk while its cut ends stay intact. Dimensions, arming distances, warning durations, jump duration, snowball speeds and growth are editable under `terrainFeatures` in `game-config.json`. `snowball` remains the separate original stationary object. Changing the three new rates does not change existing tree densities or chase speeds.

Animated encounters follow the route interpolated between gate openings rather than the full scenery spread: 90% of tree/rolling-ball placement attempts are biased to midpoints between gates. Trees sit 4–9 m beside that route and fall across it; balls start 12–24 m away. The remaining ball placements are also limited to the first bend's lateral reach. Nearby gate ice does not exclude these midpoint encounters, but gate openings, actual ice surfaces, other features and landing areas still receive clearance. `pathPlacementChance` and `pathOffsetMetres` under each feature tune this bias. Stage rates are unchanged.

`rollingSnowball.triggerDistanceMetres` is the maximum arming range (240 m), not an automatic release distance. `downhillSpeedKmh` is the terminal downhill speed (90 km/h); release adjusts it once, up to 125% of that setting, to absorb speed changes during the warning. `lateralSpeedKmh` caps the side-to-side speed; `swayAmplitudeMetres` (24 m) and `swayPeriodSeconds` (5 s of accelerated distance time) shape the sinusoidal bend. `accelerationSeconds` (1.5 s), `initialSpeedRatio` (0.15), and `trailSeconds` (8 s) tune acceleration and track lifetime. These values do not alter skier speed or chase tuning.

Stages have different lengths: gate count and speed-derived spacing determine length. Rush Hour was extended from 20 to 40 gates at the user's request; the 20–24-gate special stages remain shorter than many normal stages. NPC prey detection is now 35 m, just beyond the 31 m skier fear radius, so prey selection can occur before skiers escape. Yetis and wolves now select any eligible edible NPC roughly on the way to the player with 100% probability, including rabbits and walking people. The nearest prey wins regardless of species. Idle checks run every 0.2 s; progressing hunts remain committed, with bounded detours. Actual contact also eats NPCs, with a brief configurable Yeti/bear feeding pause. Town/protected-area prey is excluded unless a hunter owns the active course.

Every moving jump now uses a boosted speed target (jump.speedBoost, default 1.25): downhill flight runs at least 25% above ordinary stage top speed, so Momentum jumps target 112.5 km/h against its 92 km/h Yetis even from slowed snow. Manual jumps, ramps, moguls, mushrooms, both hill sizes, rainbows and log bumps share this behavior. Speed updates at takeoff and stays locked until landing. Existing faster momentum carries without repeated multiplication, while stationary jumps remain stationary. Hills/rainbows also work during recovery protection.


## Separate Endless mode

Endless Mixed Slalom is a separate summit entrance, on the left of the summit entrance row. It does not use or edit Arcade's stage rows, town flow or campaign records. It generates an uninterrupted slope with distance-based pressure, random lakes, growing traffic/forest, locally capped Yeti/wolf/bear encounters with persistent distant pursuers and long alternating forest passages and towns built by Arcade's own village generator, with separately controlled street widths/population and difficulty between appearances, retaining the shared gate combo and shield/sword mechanics. The Endless speed rises 90→130 km/h with scaled encounter geometry. Its course towns admit existing owned pursuers and forbid new Yeti spawns; Arcade villages remain protected. Fork gates accept either route once. See CONFIG for the independent `endless` section.

Shared NPC behavior: skiers/boarders now tumble on collisions and recover after 4–5 seconds; predators can eat them while down. Player falls no longer give temporary immunity to predators, so a nearby Yeti can catch you before you get back up. This applies in Arcade as well as Endless.

Illustrated finish cards dismissed by button/key appear when a block ends at town and for the final campaign victory. Internal linked-stage joins remain seamless. Perfect-gate block finishes have their own celebration art. Each town also has one cocoa shop/front-window claim for one shield and a cocoa card dismissed by button/key; the whole simulation pauses during scene cards so no pursuer advances and course timing stays unchanged.
