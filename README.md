# Frostline

**[Play in your browser](https://yogurtcp.github.io/frostline/)** · [Source on GitHub](https://github.com/yogurtcp/frostline)

Open `index.html` in a browser, or reload the already open game tab. The game contains all its images, works offline, and requires no server or installation. There are no menus or results screens.

## Controls

- Keyboard: Down points downhill and builds speed. Left/right turn through a fast diagonal, a slow diagonal, then horizontal walking. Diagonals persist on release; horizontal walking stops on release on snow. At zero speed, hold Left or Right to walk horizontally regardless of facing, including after recovering from a crash. The opposite arrow reverses horizontal walking directly. Walking into an obstacle stops you without a fall; you can reverse to walk away. Only Up climbs uphill, stopping on release on snow.
- Touch and mouse: drag relative to the point where you first pressed. Release while sliding downhill to straighten out. Release while standing or going uphill on snow to stop with the same facing.
- On phones, keep one finger down to steer and tap anywhere with a second finger to jump. Space jumps on keyboard. M toggles sound.
- Airborne jumps keep their takeoff heading and speed; steering resumes on landing.
- After a fall on ice, a fresh input gives you a push in the chosen direction so sideways and uphill recovery cannot leave you stranded.

Crashes leave you stopped until a fresh arrow-key press, Space press, or touch after the fall animation. Holding a key or keeping the same finger down does not restart skiing. Solid obstacles remain collidable on later visits; fast tree impacts break the tree and cause a fall. A brief recovery grace and separation from the last obstacle prevent getting trapped in repeated falls.

The body stays upright while standing and climbing. Fast and slow diagonal skiing have distinct 30° and 60° ski poses with animated crouching and poles. Snow acceleration is about 72% stronger on a straight descent, and snow top speeds are about 23% higher than the preceding revision. Faster jumps gain more height and airtime.

## The mountain

Ski between physical flags to choose a course. Classic slalom contains only gates and people: trees, rocks, animals, ice pools, mushrooms, and ramps stay outside its corridor. Slalom is 540 metres; freestyle and tree slalom are 1,040 metres. Lunch Rush is the faster slalom, with a 1,600-metre course and 40 metres between successive gates. Courses with gates require at least 90% correct (18 of 19 on the regular slalom), plus a downhill crossing between the finish flags. The finish opening is twice the width of that course's normal gate. Freestyle and free skiing have no gate quota but still require the finish crossing. Missing the finish allows a short uphill recovery window; continuing 32 metres beyond it records a failed run with no reward. Every set of choices shares one horizontal row. New course scenery starts beyond the visible screen, and the village is prepared before you approach the finish.

The surrounding mountain, including the forest uphill from the starting clearing, continues in every direction, with sparse trees, rocks, people, wildlife and sleeping yetis. Rabbit spawn weight is halved. Trees mix the original pines and firs with dark mountain spruce, crooked old pine, broad winter cedar, and alpine fir, drawn from a transparent pixel-art atlas and sharing the existing collision, breakage, and cat-climbing interactions. Rainbow jumps give a colorful powder trail. Small and large ice pools have irregular coves, narrow waists, snowy islands, frosted banks and cracks. The visible shoreline determines where ice starts and ends. Ice locks your entry direction and keeps you gliding even after release, including sideways and uphill. Only downhill entries accelerate: the acceleration remains 265 world units/s², with the ice limit raised from 1,200 to 1,800 world units/s. Sideways and uphill entries retain their entry speed. NPCs steer around the pools.

Villages, the summit and marked course corridors are protected: bears and yetis stay outside, including pursuers. Foxes and wolves are rare visitors to human areas; most predator encounters happen in the wilderness. Yeti challenge and penalty chases wait outside the protected piste. In the wilderness, yetis and bears can catch you. A catch automatically restarts you at the summit, preserving your wallet but losing unfinished course points. There is no death menu. Bears chase much more slowly. A direct hit above 30 km/h knocks a bear out for 12 seconds; above 60 km/h does the same to a yeti. These thresholds use the HUD speed, and the player must be moving toward the animal. Dogs and ski patrol knock you down without restarting you.

Wolves spawn in packs of 3–4, stay together, and chase nearby players slowly outside protected areas. Wolf selection is now much rarer: they account for 20% of predator selections, and the wilderness predator chance is 15%. New packs must be at least 140 metres from an existing wolf, with at most two packs within 280 metres of a proposed spawn. This reduces pack frequency without scattering lone wolves everywhere. Foxes and wolves hunt rabbits; a caught rabbit is consumed in a snow puff, and the predator pauses to eat. Both predators alternate gait frames with correctly facing sprites and a running bob. Fast skiers wear red and periodically enter from uphill at overtaking speed. They gently aim toward your predicted position while overtaking and have their own taunts and collision remarks. Wolves also pursue skiers outside protected areas; skiers shout and flee, and can be knocked down by a wolf. A direct player impact above 30 km/h kills a wolf in a snow puff; endangered nearby skiers thank you. Animals commit to avoidance turns around shorelines, buildings, and protected boundaries instead of flipping back and forth in place. Pedestrians take short, slow walks with pauses near their original positions, avoiding trees, rocks, buildings, ice and the flag openings. Finish spectators stay on their side of the finish and pause to cheer after a perfect run. Village residents follow their footpaths; all walking people have a small step-and-bob animation. Other skiers and snowboarders provide slower traffic. Cats attract nearby slower skiers. Hitting a cat at speed scares it toward a tree or house; it climbs to safety while the spectators complain.

## Snowdrift Village

The village extends 418 metres downhill and contains 84 small houses across 12 planned bands. Houses form a ski corridor that shifts left and right through town; the layout follows the route instead of placing buildings randomly. A winding main street and routed footpaths connect the houses and lift; lanes avoid building footprints. Three small squares have lamps, benches, snowmen, and overhead bunting. Four muted house trim styles share animated chimneys, warm windows, opening doors with waving residents, shop awnings, and occasional roof-snow slides. The fences have been removed. The main street and lift approach are covered in pale, textured snow and use normal snow physics. Snow also covers side-path junctions, so crossing them along the main street does not slow you down. Exposed side paths still slow skis; their paving remains fixed in world coordinates. Residents walk along the paths. Planned villages and distant gates are retained until you pass them, fixing the disappearing-house bug. The moving chairs and cable follow the slope down into town. Ski into the station to return to the summit. The course flags are all on one row below the village; additional choices lie to either side.

Paid courses deduct their fee only when you can afford it. Entry costs: Lunch Rush 210, Spore Decisions 220, Polite Pursuit 235, Last Lunch 245 coins. These are calibrated against the regular slalom's 247-coin perfect result before jumps or the new speed bonus (up to 307 with that bonus). Existing wallet balances are retained.

Entering without enough coins triggers a random ambush and makes the entire run ineligible for coins or a saved best, even with perfect gates. Failed gate quotas or missed finishes also award zero. For an eligible finish, the reward is gate/jump points + 45 + the crash bonus (50 with no crashes, otherwise max(0, 25 − 4 × crashes)) + the speed bonus for a timed course. The entry-price bonus has been removed.

At the end, an automatic 18-second overlay shows gates, percentage, misses, crashes, jumps, time, score, bonus, and coins or the reason for no reward. Skiing continues without menus. A successful 100%-gate run activates waving and shouting from spectators already waiting by the finish. Completed-course rewards, wallet balance, per-course personal best times, and the last 20 timed attempts per course save on this browser and device.

## Spore Decisions: mushroom hunt

Spore Decisions is now a 1,200-metre collection course with no slalom gates. Forty small, sparkling mushroom pickups are scattered along the descent. Ski directly over them on the ground to collect them; each disappears once and awards 8 points. These pickups do not bounce or boost you. The old sled-and-mogul obstacle mix is replaced by trees, rocks, people, dogs, cats, and bushes, with clear space reserved around each pickup. Ordinary bouncing mushrooms elsewhere on the mountain keep their original behavior.

Collect at least **36 of 40**, then cross between the finish flags, to earn a reward. Entry remains 220 coins. The HUD and finish overlay show mushroom totals, misses and the required count. A full basket triggers mushroom-specific cheers. Failed or unpaid attempts earn no coins. Finish bonuses and the existing timed bonus still apply; a clean full basket is 320 points + 95 finish bonus, plus up to 60 for speed. Records from the former mushroom slalom are kept in history but cannot count as best times for the redesigned hunt.

The `mushroomHunt` JSON section controls the count, quota, points, pickup size, distribution and obstacle clearance.

## Timed courses

The live clock starts when you cross the actual course start line, not when you choose the course. It keeps running while you recover from crashes or ski uphill and stops at a successful finish crossing. Hidden-tab time is paused with the game. Slalom finishes require the existing 90% gate quota; Spore Decisions requires its mushroom quota; failed or unpaid runs cannot set a qualifying best time or earn a speed bonus. Their attempt times still appear in the local history.

The bonus scales linearly from zero at the par time to **60 coins** at the gold time, capped at 60 even if you go faster:

`round(maxBonus × clamp((parSeconds − time) / (parSeconds − goldSeconds), 0, 1))`

| Course | Gold time (+60) | Par time (+0) |
| --- | ---: | ---: |
| Slalom | 22 s | 40 s |
| Tree slalom | 42 s | 72 s |
| Lunch Rush | 45 s | 81 s |
| Spore Decisions | 48 s | 80 s |
| Polite Pursuit | 41 s | 69 s |
| Last Lunch | 43 s | 75 s |

For example, a clean, perfect regular slalom in 31 seconds pays 152 gate points + 95 finish bonus + 30 speed bonus = **277 coins**. Freestyle and free skiing have no slalom speed bonus. These initial target times are tuning defaults and have not been playtested for difficulty.

The clock and personal best appear while racing; best times also appear beside course entry flags. The automatic finish overlay shows elapsed time, finish and speed bonuses, coins, and a new-best indicator. Changing key course/physics settings starts a new comparable best-time record while retaining attempt history. Increase `timing.recordVersion` after other edits that make old times incomparable.

## Editing game settings

[`game-config.json`](game-config.json) is the editable source for gameplay tuning. [`game-config.schema.json`](game-config.schema.json) supplies editor completion and validation. See [`CONFIG.md`](CONFIG.md) for sections, units, and examples.

- **Hosted game:** edit and publish `game-config.json`, then reload. It is fetched without caching on startup.
- **Local `file://` game:** edit the JSON, run `python3 build.py`, and reload `index.html`. Browsers restrict sibling-file fetches, so the offline HTML embeds the settings and assets.
- Changes to JavaScript, the template, or assets also require rebuilding. Invalid settings produce a clear startup error. The build validates the JSON before replacing the game.

## Assets and source

The player remains approximately 22 pixels wide, and trees are generally 30–45 pixels wide. The renderer samples the PNG sprite atlases into a fixed 30-color palette. The wildlife, cat, standing skier and uphill skier were made with the built-in image generation tool; prompts are recorded in `asset-prompts.md`.

Edit `game.js` and `index.template.html`, then run `python3 build.py` to rebuild the self-contained game. Ramps and snow humps are drawn as ground scenery beneath the player. The PNG previews are captures from the production canvas renderer.

## Development and publishing

Run `python3 build.py` after editing source, configuration, the template, or PNG atlases. This regenerates the self-contained `index.html`. No package install or server is needed to play locally.

The repository includes the source, build script, documentation, original asset atlases, and built game. GitHub Pages serves the root of the `main` branch. Commit the rebuilt `index.html` with source changes and push `main` to publish updates.

## Review status

The source was reviewed for state, collision, configuration, wildlife, timing, and rendering issues. Fixes include retaining distant scenery, safe recovery from malformed saved data, configurable gate-point labels, matching skier poses to actual movement, and reducing pathfinding and road-rendering work. The offline game was rebuilt and the village and finish overlay were visually inspected with the production canvas renderer. No automated gameplay tests were run for this revision.
