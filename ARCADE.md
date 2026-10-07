# Arcade stage editor

## Rollback and design intent

The gate-pace pursuit calculation and the faster/wider changes to stages 3–4 were reverted. Their defaults are back to 103 km/h and 30 m vertical gate spacing. Yeti speeds are now explicit absolute values; there are no calculated chase-speed caps or automatic adjustments.

Player feedback to preserve: two warmups are enough; stage 2 needs more objects; stage 3 needs visible start-line yetis and sparse trees; stage 4 needs denser trees; stage 5 sparse trees, stage 6 dense trees and stage 7 heavier traffic. There are 12 stages, editable in order, with safe towns between them. No menus. Missing the finish fails Arcade in place; death returns to the summit.

## Quick start

Edit `game-config.json`, at the top under `arcade`.

```json
"startStage": 8,
"autoStart": true
```

This loads you just above stage 8’s start line, waiting for your input. Death/reset starts there again. `autoStart: false` keeps the summit; the Arcade entrance still uses `startStage`. Set `startStage: 1` for a complete run. Starts above 1 are visibly marked PRACTICE and do not overwrite the full-run record. Completion is based on reaching the last configured stage, including in practice.

For live local tuning, run `python3 serve.py`, open http://127.0.0.1:8765/, then edit JSON and reload. For standalone `file://` play, run `python3 build.py` from this folder after editing, then reload `index.html`. Hosted play reads the JSON on refresh. Validation reports unknown item names, out-of-range values, an invalid start stage, or more sword gates than total gates.

## Add or edit a stage

Copy any entry in `arcade.stages`, change `name`, and insert it where you want. Array order defines progression; there is no fixed stage count or hardcoded name list. A compact complete stage can look like this (objects missing from `itemRates` use their knob or tier rate):

```json
{
  "name": "My snowy disaster",
  "knobs": [2, 2, 2, 2],
  "yetiColor": "teal",
  "gates": {
    "count": 18,
    "swordGateCount": 4,
    "icePercent": 25
  },
  "itemSpreadMetres": 32,
  "endTrafficMultiplier": 1.5,
  "tierRates": {
    "slightlyRare": 0.3,
    "veryRare": 0
  },
  "itemRates": {
    "pine": 2,
    "skier": 3,
    "rock": 0
  }
}
```

Knobs read `[obstacles, chase, miss, speed]`, levels 1–4 each, resolved through the central `arcade.knobLevels` table. Here the common rate comes from obstacle level 2 (0.5); `pine` overrides to 2, `skier` to 3, and `rock` stays disabled despite being common.

### Gates

- `count`: exact total number of gates, including sword gates.
- `swordGateCount`: exact number of sword gates, distributed along the course. Zero disables them; all gates can be sword gates if desired.

Geometry (horizontal/vertical distance, opening, first-gate and finish run-outs) derives from the speed knob: each is a fixed percentage of the stage top speed from `arcade.knobLevels.gateSpacing`. Centres alternate at plus/minus half the derived horizontal distance. There is no added course sway.

Course length is the derived first run-out + `(count − 1) × derived vertical spacing` + derived finish run-out. Changing count moves the finish and following town together. The finish opening still uses the global `race.finishWidthMultiplier` (2).

`icePercent` (0–100, default 0) selects that percentage of gates, rounded to a whole number, for ice spanning the opening. Selected gates vary each run. These patches are independent of `smallLake`/`largeLake` density; use zero for both if you only want gate ice.

Design guideline: keep gate geometry the same across stages except for speed — faster stages get more spread-out gates (larger vertical distance and wider openings) so reaction time stays fair.

### Gate combos and gear

All correct gates share one streak, regardless of shield/sword type. They award 1, then 2, then 3 points per gate; missing a gate resets the streak. Three points equal the previous full gate charge (one sword-gate unit or `shieldsPerStage / ordinaryGateCount` shield charge). Thus the first two gates charge at one-third and two-thirds speed. `swordGatesPerSword` still counts full-charge equivalents. The streak carries through towns and continues even when an inventory is full, but full inventories gain no charge.

Gate labels and the top CHAIN indicator use three increasing text weights and `arcade.gear.comboColors`. Shields are not consumed in towns or their safe approach paths. Death/new Arcade run resets the streak.

### Yetis

The chase knob sets the waiting start-line group from `knobLevels.chaseCount` and `chaseSpeedPercent` (percent of stage top); `yetiColor` (teal/orange/violet) paints it. The miss knob arms that share of gates (`knobLevels.missGatePercent`, rounded) with `knobLevels.missWolves` sleeping wolves each, marked with a red `!`; they wake at the chase speed when their gate is missed. Clearing an armed gate leaves its wolves asleep. Bumping one wakes it. Colors select visual tiers only. Zero count/percent disables the group. No gate-pace calculation, catch-up boost, or hidden color-speed multiplier applies.

Start-line yetis remain visible before the race, react when you cross, and chase after `arcade.wakeSeconds`. Pursuers follow off piste and retire at course end. The separately placed sleeping yeti items use their named color and the stage’s knob-derived chase speed, even if its start-line count is zero.

### Item density

The obstacle knob sets the `common` spawn rate from `knobLevels.obstacles`; each stage sets `slightlyRare`/`veryRare` in `tierRates`, in placement attempts per 100 m of course. Every catalog object spawns at its tier’s rate unless that stage lists it in `itemRates` with an explicit number; `0` disables the object. Omit `itemRates` keys — or the whole object — to run on tier defaults. The tier of each object lives in the single global map `arcade.itemTiers`. There are no random mixed item tables, automatic tree substitutions, mandatory terrain features, or hidden Arcade overtaker timers.

Densities are placement attempts, not exact counts: gates, finish openings, lakes, other objects and jump landing zones remain clear. `itemSpreadMetres` controls how far from the centreline items can be placed. Increasing it gives large objects more room. Rare rates may yield no objects on a short stage. Towns, finish spectators, structural start/finish flags, the connecting lift cable and off-piste scenery retain their separate existing config sections; they are not counted as course item spawns.

`endTrafficMultiplier` scales the four skier/boarder entries gradually from 1× at the start to the configured finish multiplier. Set it to 1 for constant density. Overtakers are scheduled by distance along the course: passing their hidden trigger brings a fast skier from uphill. Ahead-of-player `fastSkier` traffic remains catchable, as before.

| Group | Individual keys |
| --- | --- |
| Trees | `pine`, `fir`, `smallPine`, `spruceTree`, `crookedTree`, `cedarTree`, `alpineTree` |
| Obstacles | `rock`, `pebble`, `stump`, `bush`, `mushroom`, `sled`, `snowball` |
| Jumps and surfaces | `ramp`, `mogul`, `rainbow`, `smallLake`, `largeLake`, `snowPath`, `pavedPath` |
| Skiers | `skier`, `fastSkier`, `overtakingSkier`, `boarder` |
| Pedestrians | `personRed`, `personYellow`, `personGreen` |
| Animals | `dog`, `hostileDog`, `cat`, `rabbit`, `fox`, `wolf`, `wolfPack`, `bear` |
| Sleeping yetis | `yetiTeal`, `yetiOrange`, `yetiViolet` |
| Buildings | `lodge`, `rental`, `cottage`, `chalet`, `inn`, `cafe`, `hotel`, `skiShop` |
| Props | `lamp`, `bench`, `snowman`, `bunting`, `powderPile`, `pigeons`, `breadStand`, `skiRack`, `lift`, `sign`, `flag`, `star` |

| Tier | Members |
| --- | --- |
| `common` | pine, fir, smallPine, spruceTree, crookedTree, cedarTree, alpineTree, rock, pebble, stump, bush, skier, boarder, personRed, personYellow, personGreen |
| `slightlyRare` | ramp, mogul, rainbow, mushroom, sled, snowball, fastSkier, overtakingSkier, dog, cat, rabbit, fox, lamp, bench, snowman, sign, flag, star, snowPath, pavedPath, bunting, powderPile, pigeons, skiRack, breadStand |
| `veryRare` | smallLake, largeLake, hostileDog, wolf, bear, wolfPack, yetiTeal, yetiOrange, yetiViolet, lodge, rental, cottage, chalet, inn, cafe, hotel, skiShop, lift |

`wolf` counts individuals; `wolfPack` counts packs of the configured 3–4 wolves. Explicitly placed course predators can chase/hunt on the piste; protected towns remain safe. House variants share existing collision footprints. `star`, `sign`, and the standalone `flag` are decorative, not currency or extra scoring gates. The stage `lift` is a prop during Arcade; it cannot exit the run. Animation poses (running/left/falling sprites), UI icons, and labels are not separate gameplay items.

## Current defaults

| # | Name | Knobs O/C/M/S | Top | Chase | Guarded |
| --- | --- | ---: | ---: | --- | ---: |
| 1 | First Tracks | 1111 | 90 | none | 0% |
| 2 | Mind the Pines | 2111 | 90 | none | 0% |
| 3 | Polite Pursuit | 2211 | 90 | 1 teal @45 | 0% |
| 4 | Forest Company | 2221 | 90 | 1 teal @45 | 25% |
| 5 | Orange Alert | 2222 | 105 | 1 orange @52 | 25% |
| 6 | Timber Express | 3222 | 105 | 1 orange @52 | 25% |
| 7 | Rush Hour | 3322 | 105 | 2 teal @74 | 25% |
| 8 | Frozen Assets | 3332 | 105 | 2 orange @74 | 50% |
| 9 | Air Mail | 3333 | 120 | 2 orange @84 | 50% |
| 10 | Flag Consequences | 4333 | 120 | 2 orange @84 | 50% |
| 11 | Violet Warning | 4433 | 120 | 3 violet @108 | 50% |
| 12 | Last Tracks | 4443 | 120 | 3 violet @108 | 100% |

Knobs read `[obstacles, chase, miss, speed]`, levels 1–4. Chase shows resolved count, color and km/h; guarded shows the share of gates with a 3-wolf pack. Common rate per obstacle level lives in `knobLevels`.

## Gear, towns and records

Ordinary successful gates provide 1.5 shield charges per fully cleared stage; eight successful sword gates earn one sword. These global amounts remain in `arcade.gear`. Charge and up to two of each item carry through towns. An attempt starts empty. If every gate is a sword gate, that stage awards no shield charge.

Towns are safe intermissions and the next stage starts automatically at their exit. No money or timed qualification applies. Crossing outside the finish fails Arcade without teleporting; death returns to the summit (or the configured automatic start). Completing the final configured stage ends the run.

`frostline-v2` browser storage keeps wallet, regular-course times and Arcade records. Practice starts do not update Arcade records. `campaignVersion` can be incremented after a substantial redesign to retain the previous record separately. Refresh starts a new attempt rather than resuming one.
