# Arcade: 12 stages, one descent

## Design brief

Player feedback behind this layout: two warmups are enough; stage 2 needs more objects; stage 3 needs visible pursuing yetis and sparse trees; stage 4 needs a much denser forest; stage 5 needs sparse trees, stage 6 dense trees, and stage 7 clearly heavier traffic. Later stages must introduce distinct hazards instead of repeating similar courses. Traffic should build toward each finish. Towns provide safe pauses without menus. Sword gates should be rare before threats appear. This replaces the repetitive 32-stage campaign.

## Stage list

Tree and traffic columns are placement attempts per 100 metres. Clear gate openings, lakes and landing corridors can reduce actual placement. Traffic includes skiers, snowboarders and fast skiers; groups can contain two people.

| # | Name | Length | Terrain | Trees / 100 m | Traffic groups / 100 m at start | Yeti pressure (% of clean gate pace) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | First Tracks | 400 m | Open | 0 | 2 | None |
| 2 | Mind the Pines | 500 m | Dense forest | 5 | 3.3 | None |
| 3 | Polite Pursuit | 600 m | Sparse forest | 2.5 | 3.4 | 3 slow (80%) |
| 4 | Forest Company | 650 m | Dense forest | 6 | 3.6 | 3 slow (82%) |
| 5 | Orange Alert | 700 m | Sparse forest | 2.5 | 3.8 | 3 fast (86%) |
| 6 | Timber Express | 750 m | Dense forest | 6.5 | 4 | 3 fast (88%) |
| 7 | Rush Hour | 800 m | Dense forest | 5 | 6 | 3 fast (88%) |
| 8 | Frozen Assets | 850 m | Forest + ice | 2.5 | 4.4 | 3 fast (88%) |
| 9 | Air Mail | 900 m | Forest + jumps | 4 | 4.5 | 3 fast (90%) |
| 10 | Flag Consequences | 1000 m | Dense forest | 6 | 4.8 | 3 fast (90%); +1 fast per miss |
| 11 | Violet Warning | 1100 m | Dense forest | 6 | 5 | 2 elite (92%); +2 fast per miss |
| 12 | Last Tracks | 1400 m | Mixed forest / ice / jumps | 7 | 5.5 | 2 elite (94%); +2 fast per miss |

Traffic builds linearly to 1.4× at the finish of stages 1–2 and 1.5× in stages 3–12. Overtakers arrive more frequently using the same multiplier. Rush Hour raises its baseline to 6 groups per 100 m, 45% pairs, 40% fast skiers and a 7-second opening overtaker interval. Snowboarders are explicitly included in every stage.

## Pursuit and finish rules

Starting yetis are placed beside the actual start line before it enters view. They wait with a visible idle pose. Crossing the start makes them react with an exclamation mark and snow burst, then chase after 0.8 seconds. They start 11 metres to the side, leaving the centre skiable. No teleporting or distance-based catch-up is used. Teal, orange and violet identify slow, fast and elite pursuit tiers.

Stages 3–4 now use 132 km/h top speed and 60 m gate spacing. Starting yeti speeds use `yetiGatePacePercent`, a percentage of the calculated slowest clean gate leg, rather than straight-down top speed. Missed-gate pursuers use `missYetiGatePacePercent` with the same baseline. Tiers express pressure relative to their own course: a tightly turning course can have a lower absolute yeti speed than an open, faster course. Pursuers follow off piste and retire when their course ends. Towns remain safe; there is no time limit.

### Pursuit calculation

For steering angle θ, the current snow-speed cap is `top × (0.36 + 0.64 × cos²θ)`. Downhill progress is that speed multiplied by `cosθ`: 72.7% of top at 30°, but only 26% at 60°. Using straight-down top speed for pursuit therefore punished clean slalom turns.

The game calculates the actual gate centres, including course sway, and includes the start and finish. For every leg it solves the time needed with the available keyboard steering angles (0°, 30°, 60°, plus horizontal traversal if necessary), adds 0.3 seconds for steering/settling, and takes the slowest leg’s downhill pace. Gate width is not used to cut corners, giving the player additional room. This baseline is calculated once for the course; yetis never speed up in response to the player. The finish now reserves at least one gate spacing for the final approach.

Stage 3 yetis use 80% of the baseline (20% margin); stage 4 uses 82%. Later stages use 86–94%. These are conservative clean-line calculations, not a guarantee for every trajectory: crashes, stops, tree detours and ice can still change the gap. Smooth gate-following should open a lead over each leg; a pursuer can still close briefly during a sharp turn.

Run `python3 calculate-pursuit.py` to recompute the table from your config. Speeds below use the game’s km/h scale; “clean downhill pace” is progress down the course, not total ski speed.

| Stage | Top km/h | Gate gap m | Gates | Clean downhill pace | Starting yeti | Missed-gate yeti |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1. First Tracks | 90 | 30 | 11 | 31.0 | 0.0 | — |
| 2. Mind the Pines | 90 | 30 | 15 | 34.4 | 0.0 | — |
| 3. Polite Pursuit | 132 | 60 | 9 | 79.5 | 63.6 | — |
| 4. Forest Company | 132 | 60 | 10 | 79.5 | 65.2 | — |
| 5. Orange Alert | 132 | 40 | 16 | 60.1 | 51.7 | — |
| 6. Timber Express | 132 | 40 | 17 | 60.1 | 52.9 | — |
| 7. Rush Hour | 132 | 40 | 18 | 60.1 | 52.9 | — |
| 8. Frozen Assets | 132 | 40 | 20 | 60.1 | 52.9 | — |
| 9. Air Mail | 132 | 48 | 17 | 70.3 | 63.3 | — |
| 10. Flag Consequences | 132 | 40 | 23 | 60.1 | 54.1 | 54.1 |
| 11. Violet Warning | 132 | 40 | 26 | 59.6 | 54.8 | 53.6 |
| 12. Last Tracks | 132 | 48 | 28 | 69.3 | 65.1 | 62.3 |

Cross downhill between finish flags to advance; Arcade does not require the regular 90% gate quota. Missing the finish immediately ends Arcade in place, preserving position, speed, controls and the world. Keep skiing into the same town with normal course choices. Getting eaten returns to the summit. Completing stage 12 wins Arcade. All results appear on the snow without menus.

## Shields and swords

Ordinary successful gates total 1.5 shield charges per stage. Calm stages have one purple sword gate; threatened stages have four. Eight successful sword gates earn one sword. Clearing every sword gate gives 2/8 charge after stage 2, 6/8 after stage 3, and the first sword during stage 4. Inventory and partial charges carry through towns; each attempt starts empty, with at most two of each item. A full inventory pauses charging.

Shields prevent obstacle/skier crashes. Swords defeat contacting hostile animals when an ordinary high-speed impact would not already defeat them. Harmless contacts do not spend items. Filling icons at the top brighten when ready, and activation shows a shield/slash effect.

## Editing stages

`game-config.json` now puts `arcade.stages` at the top. Array order is stage order. Each stage explicitly lists its own length, speed, density, traffic build, pursuit and features. Schema hover descriptions explain units and limits.

| Field | Meaning |
| --- | --- |
| `lengthMetres` | Course length in metres |
| `topSpeedKmh` | Straight-down top speed on the HUD |
| `gateSpacingMetres` | Distance between gates; larger means fewer |
| `treesPer100m` | More means denser trees; 0 means none |
| `skierGroupsPer100m` | Opening traffic density; more means busier |
| `endTrafficMultiplier` | Finish density divided by opening density; 1 disables the build |
| `fastSkierPercent` | Percentage of traffic that is fast skiers |
| `snowboarderPercent` | Percentage of remaining traffic that is snowboarders |
| `skierPairPercent` | Percentage of traffic groups containing two people |
| `overtakeSeconds` | Opening interval between uphill overtakers; lower means more |
| `yetis`, `yetiTier`, `yetiGatePacePercent` | Starting pursuer count, color tier and percentage of calculated clean gate pace |
| `missYetis`, `missTier`, `missYetiGatePacePercent` | Number, tier and clean-pace percentage for missed-gate pursuers |
| `gateScale`, `swayScale` | Opening width / turn width multipliers |
| `ice`, `jumps`, `mixed` | Enable terrain features; mixed alternates six sections |
| `featureEveryGates` | Interval for ice/jumps or occasional forest ramps/moguls/bushes |

For example, change stage 4's `treesPer100m` from 6 to 8 for more trees, or `endTrafficMultiplier` from 1.5 to 1.2 for a gentler finish. Gate and landing clearances remain enforced. Very short courses may contain fewer sword gates than requested because one ordinary gate is reserved.

After editing for the local `file://` game, run `python3 build.py`, then reload `index.html`. Hosted play loads the JSON on refresh. No JavaScript edits are needed for these settings. `arcade.pursuitTurnAllowanceSeconds` controls the steering allowance; `finishApproachGateSpacings` controls finish approach room. The game automatically recalculates pursuit speeds when a new course is created from the edited config.

## Saved records

Records use browser local storage `frostline-v2`. `arcadeRecord` saves furthest distance/stage and the last run, not a resumable run. This condensed campaign uses `arcade.campaignVersion: 2`; the old 32-stage record is retained under `previousCampaign` and is not compared against this layout. Wallet and regular-course records are preserved. Increment the version after another substantial redesign if records would no longer be comparable.
