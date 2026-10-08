# Arcade stage editor

## Rollback and design intent

The gate-pace pursuit calculation and the faster/wider changes to stages 3–4 were reverted. Their defaults are back to 103 km/h and 30 m vertical gate spacing. Yeti speeds are now explicit absolute values; there are no calculated chase-speed caps or automatic adjustments.

Player feedback to preserve: two warmups are enough; stage 2 needs more objects; stage 3 needs visible start-line yetis and sparse trees; stage 4 needs denser trees; stage 5 sparse trees, stage 6 dense trees and stage 7 heavier traffic. There are 23 stages, editable in order, with safe towns between them. No menus. Missing the finish fails Arcade in place; death returns to the summit.

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

### Gates

- `count`: exact total number of gates, including sword gates.
- `swordGateCount`: exact number of sword gates, distributed along the course. Zero disables them; all gates can be sword gates if desired.

Geometry (horizontal/vertical distance, opening, first-gate and finish run-outs) derives from the speed knob: each is a fixed percentage of the stage top speed from `arcade.knobLevels.gateSpacing`. Centres alternate at plus/minus half the derived horizontal distance. There is no added course sway.

Course length is the derived first run-out + `(count − 1) × derived vertical spacing` + derived finish run-out. Changing count moves the finish and following town together. The finish opening still uses the global `race.finishWidthMultiplier` (2).

The ice knob sets the share of gates with ice spanning the opening from `knobLevels.iceGatePercent` (rounded to whole gates, level 1 is none). Selected gates vary each run. These patches are independent of `smallLake`/`largeLake` density; use zero for both if you only want gate ice.

Design guideline: keep gate geometry the same across stages except for speed — faster stages get more spread-out gates (larger vertical distance and wider openings) so reaction time stays fair.

### Gate combos and gear

All correct gates share one streak, regardless of shield/sword type. They award 1, then 2, then 3 points per gate; missing a gate resets the streak. Three points equal the previous full gate charge (one sword-gate unit or `shieldsPerStage / ordinaryGateCount` shield charge). Thus the first two gates charge at one-third and two-thirds speed. `swordGatesPerSword` still counts full-charge equivalents. The streak carries through towns and continues even when an inventory is full, but full inventories gain no charge.

Gate labels show each gate's contribution as a share of one full item (`+14% SHIELD`, `+25% SWORD`): the streak points scaled by that stage's per-gate charge, so the number always reads as progress toward a full shield or sword. Label color and weight still encode the streak tier (1/2/3), and labels fade out ~2.5 s after you pass. There is no top CHAIN indicator. Shields are not consumed in towns or their safe approach paths. Death/new Arcade run resets the streak.

### Yetis

The chase knob sets the waiting start-line group from `knobLevels.chaseCount` and `chaseSpeedPercent` (percent of stage top); `yetiColor` (teal/orange/violet) paints it. The miss knob arms that share of gates (`knobLevels.missGatePercent`, rounded) with `knobLevels.missWolves` sleeping wolves each, marked with a red `!`; they wake at the chase speed when their gate is missed. Clearing an armed gate leaves its wolves asleep. Bumping one wakes it. Colors select visual tiers only. Zero count/percent disables the group. No gate-pace calculation, catch-up boost, or hidden color-speed multiplier applies.

Start-line yetis remain visible before the race, react when you cross, and chase after `arcade.wakeSeconds`. Pursuers follow off piste and retire at course end. The separately placed sleeping yeti items use their named color and the stage’s knob-derived chase speed, even if its start-line count is zero.

### Item density

The obstacle knob sets the `common` spawn rate from `knobLevels.obstacles`; each stage sets `slightlyRare`/`veryRare` in `tierRates`, in placement attempts per 100 m of course. Every catalog object spawns at its tier’s rate unless that stage lists it in `itemRates` with an explicit number; `0` disables the object. Omit `itemRates` keys — or the whole object — to run on tier defaults. The tier of each object lives in the single global map `arcade.itemTiers`. There are no random mixed item tables, automatic tree substitutions, mandatory terrain features, or hidden Arcade overtaker timers.

Densities are placement attempts, not exact counts: gates, finish openings, lakes, other objects and jump landing zones remain clear. `itemSpreadMetres` controls how far from the centreline items can be placed (default ±55 m, covering the flanks out to the cleared band so skirting the course still meets forest). Placement counts scale with spread against the 32 m reference the knob densities were tuned at, so widening the band holds per-area density instead of thinning the middle. Rare rates may yield no objects on a short stage. Towns, finish spectators, structural start/finish flags, the connecting lift cable and off-piste scenery retain their separate existing config sections; they are not counted as course item spawns.

`endTrafficMultiplier` scales the four skier/boarder entries gradually from 1× at the start to the configured finish multiplier. Set it to 1 for constant density. Overtakers are scheduled by distance along the course: passing their hidden trigger brings a fast skier from uphill. Ahead-of-player `fastSkier` traffic remains catchable, as before.

| Group | Individual keys |
| --- | --- |
| Trees | `pine`, `fir`, `smallPine`, `spruceTree`, `crookedTree`, `cedarTree`, `alpineTree` |
| Obstacles | `rock`, `pebble`, `stump`, `bush`, `mushroom`, `sled`, `snowball` |
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
| `slightlyRare` | ramp, mogul, rainbow, smallHill, largeHill, mushroom, sled, snowball, fastSkier, overtakingSkier, dog, cat, rabbit, fox, rugged, lamp, bench, snowman, sign, flag, star, snowPath, pavedPath, bunting, powderPile, pigeons, skiRack, breadStand |
| `veryRare` | smallLake, largeLake, wolf, bear, wolfPack, yetiTeal, yetiOrange, yetiViolet, lodge, rental, cottage, chalet, inn, cafe, hotel, skiShop, lift |

`wolf` counts individuals; `wolfPack` counts packs of the configured 3–4 wolves. Explicitly placed course predators can chase/hunt on the piste; protected towns remain safe. House variants share existing collision footprints. `star`, `sign`, and the standalone `flag` are decorative, not currency or extra scoring gates. The stage `lift` is a prop during Arcade; it cannot exit the run. Animation poses (running/left/falling sprites), UI icons, and labels are not separate gameplay items. Courses are forest: buildings, props, decor and paths never scatter there via tier rates (they stay in `itemTiers` for future village scatter); only an explicit per-stage `itemRates` pin places one on a course. Hills are SkiFree-style contour jumps: `smallHill` launches briefly, `largeHill` is the biggest air in the game. `rugged` is scruffy ground that caps speed at half while you cross it.

## Current defaults

| # | Name | Knobs O/C/M/S/I | Top | Chase | Guarded | Ice |
| --- | --- | ---: | ---: | --- | --- | ---: |
| 1 | Warmup | 11111 | 90 | none | 0% | 0% |
| 2 | Denser Forest | 21111 | 90 | none | 0% | 0% |
| 3 | Monster | 22111 | 90 | 1 teal @45 | 0% | 0% |
| 4 | Miss and Be Eaten | 22211 | 90 | 1 teal @45 | 25% | 0% |
| 5 | Fast Monster | 13111 | 90 | 2 orange @63 | 0% | 0% |
| 6 | 2 Fast 2 Forest | 23111 | 90 | 2 orange @63 | 0% | 0% |
| 7 | Darker Woods, Icy Lakes | 32112 | 90 | 1 orange @45 | 0% | 25% |
| 8 | Dense Chase | 33122 | 105 | 2 violet @74 | 0% | 25% |
| 9 | Here We Go | 12131 | 120 | 1 orange @60 | 0% | 0% |
| 10 | Faster, Careful | 22232 | 120 | 1 orange @60 | 25% | 25% |
| 11 | My God | 23333 | 120 | 2 orange @84 | 50% | 50% |
| 12 | Oh No | 33333 | 120 | 2 orange @84 | 50% | 50% |
| 13 | Darkest Spots | 41112 | 90 | none | 0% | 25% |
| 14 | Darker and Darker | 42113 | 90 | 1 violet @45 | 0% | 50% |
| 15 | Almost There | 43113 | 90 | 2 violet @63 | 0% | 50% |
| 16 | Good Luck | 14114 | 90 | 3 violet @81 | 0% | 100% |
| 17 | Too Fast | 11141 | 150 | none | 0% | 0% |
| 18 | Don't Miss | 11411 | 90 | none | 100% | 0% |
| 19 | Nowhere to Hide | 34111 | 90 | 3 orange @81 | 0% | 0% |
| 20 | Black Ice | 11134 | 120 | none | 0% | 100% |
| 21 | No Room for Error | 22442 | 150 | 1 orange @75 | 100% | 25% |
| 22 | Everything Hurts | 34333 | 120 | 2 orange @84 | 50% | 50% |
| 23 | You Asked For This | 44444 | 150 | 3 orange @135 | 100% | 100% |

Knobs read `[obstacles, chase, miss, speed, ice]`, levels 1–4. Chase shows resolved count, color and km/h; guarded shows the share of gates with a 3-wolf pack; ice shows the share of gates with a frozen patch. Common rate per obstacle level lives in `knobLevels`. The curve previews each tier in isolation before combining: 1 opens with one small hill, large hill and rugged patch above the first gate, then runs empty; 2 adds forest; 3 wakes the first monster; 4 punishes missed gates with wolves; 5–6 preview chase-3, first clean then with trees; 7 crosses dense forest with chase-2 and first ice (25%); 8 is a dense chase at speed 105; 9 spotlights speed 120 on an empty piste; 10 adds wolves and ice at 120; 11–12 run full 120-tier stages up to all-3s; 13–15 cross the max forest with rising chase and 25–50% ice; 16 empties the forest for a 3-yeti boss chase on full ice. 17–20 isolate the remaining level-4s: 150 speed alone, fully guarded gates, a boss chase in dense forest, and full ice at speed 120; 21–22 combine speed-4 and miss-4 with the rest; 23 runs every knob at maximum. All knob levels are now in play; guards peak at 100% on stages 18, 21 and 23.

## Gear, towns and records

Ordinary successful gates provide 1.5 shield charges per fully cleared stage; four successful sword gates earn one sword. These global amounts remain in `arcade.gear`. Charge and up to four of each item carry through towns. An attempt starts empty. If every gate is a sword gate, that stage awards no shield charge. Touching an enemy (bear, sleeping yeti, wolf) slows you down instead of crashing you, and spends no sword or shield; ramming one dead at speed keeps that clean kill, and sleeping yetis die on any touch above a creep. Dogs and people still knock you down (shields apply). Chaser catches and wolf attacks stay lethal, with swords working as before.

Towns are safe intermissions and the next stage starts automatically at their exit. No money or timed qualification applies. Crossing outside the finish fails Arcade without teleporting; death returns to the summit (or the configured automatic start). Completing the final configured stage ends the run.

`frostline-v2` browser storage keeps wallet, regular-course times and Arcade records. Practice starts do not update Arcade records. `campaignVersion` can be incremented after a substantial redesign to retain the previous record separately. Refresh starts a new attempt rather than resuming one.
