# Frostline

**[Play in your browser](https://yogurtcp.github.io/frostline/)** · [Source on GitHub](https://github.com/yogurtcp/frostline)

Play the hosted game or open the downloaded `index.html`. The single file contains its images and remains playable offline. The hosted game can also be installed using **Install app** at the summit; Chrome/Edge can show a native prompt, while Safari on iPhone/iPad uses Share → Add to Home Screen. Installation is optional and gameplay still uses physical flags, without menus.

Installed and cached hosted copies check for a new published build once at startup when online. A complete update is cached before activation and opened before gameplay starts. A slow/failed update leaves the current copy playable and can apply on the next startup; active runs in other windows are never forcibly reloaded. There is no focus/reconnection polling or promise of updates while the app is closed. Wallet, records and settings keep the same browser storage. A different browser/address, including switching from a downloaded file to the hosted site, has a separate save. Browser storage can still be cleared or evicted by the browser.

## Controls

- Keyboard: Down points downhill and builds speed. Left/right turn through a fast diagonal, a slow diagonal, then horizontal walking. Diagonals persist on release; horizontal walking coasts briefly to a stop on snow. At zero speed, hold Left or Right to walk horizontally regardless of facing, including after recovering from a crash. The opposite arrow reverses horizontal walking directly. At 8 km/h or less, obstacle impacts are ignored so you can creep clear after a crash; those contacts stay harmless until you fully separate, even while accelerating. Above that threshold, walking into an obstacle stops you without a fall; you can reverse to walk away. Only Up climbs uphill, coasting to a stop on release on snow.
- Touch and mouse: swipe left/right to use the same steering steps as the keyboard. A short swipe turns once; a long swipe turns twice, capped at two presses per gesture. Swipe down to point downhill or up to climb. Diagonals persist after release; uphill and horizontal moves coast to a stop when released. Hold the swipe to keep climbing or traversing. Small accidental movements are ignored.
- On phones, keep one finger down to steer and tap anywhere with a second finger to jump. Space jumps on keyboard. M toggles sound.
- Every moving jump gets a speed boost; downhill jumps run at least 25% above the stage’s ordinary top speed, including takeoffs from rough snow. Flight keeps its takeoff heading and boosted speed. Left/right adjusts the ski pose; Up tucks, Down spreads the skis into a V. Touch/mouse swipes control the same poses. Release relaxes back toward neutral. Pose changes do not steer the flight; normal steering resumes on landing. Jumps clear trees; only buildings can hit you mid-air.
- After a fall on ice, a fresh input gives you a push in the chosen direction so sideways and uphill recovery cannot leave you stranded.

Crashes leave you stopped until a fresh arrow-key press, Space press, or touch after the fall animation. Holding a key or keeping the same finger down does not restart skiing. Solid obstacles remain collidable on later visits; fast tree impacts break the tree and cause a fall. A brief recovery grace and separation from the last obstacle prevent getting trapped in repeated falls. The player’s pose follows actual motion: ice-locked sliding and braking momentum keep animating even if the last requested direction was up or sideways.

The body stays upright while standing and climbing. Fast and slow diagonal skiing have distinct 30° and 60° ski poses with animated crouching and poles. Snow acceleration is strongest on a straight descent (doubled from the original tuning for faster crash recovery), and snow top speeds are about 23% higher than the preceding revision. Faster jumps gain more height and airtime.

## The mountain

**Arcade** is the infinite mixed slope: changing regions, gates, towns and growing pursuit on one continuous run. It replaces the former stage campaign entrance. Existing infinite-distance records are preserved. Town cocoa shops offer a floating, steaming pixel-art cup with gold sparkles; collect it once per town for a shield and a cozy break.

Ski between physical flags to choose a course. Classic slalom contains only gates and people: trees, rocks, animals, ice pools, mushrooms, and ramps stay outside its corridor. Slalom is 540 metres; freestyle and tree slalom are 1,040 metres. Lunch Rush is the faster slalom, with a 1,600-metre course and 40 metres between successive gates. Courses with gates require at least 90% correct (18 of 19 on the regular slalom), plus a downhill crossing between the finish flags. The finish opening is twice the width of that course's normal gate. Freestyle and free skiing have no gate quota but still require the finish crossing. Missing the finish allows a short uphill recovery window; continuing 32 metres beyond it records a failed run with no reward. Every set of choices shares one horizontal row. New course scenery starts beyond the visible screen, and the village is prepared before you approach the finish.

The surrounding mountain, including the forest uphill from the starting clearing, continues in every direction, with sparse trees, rocks, people, wildlife and sleeping yetis. Rabbit spawn weight is halved. Trees mix the original pines and firs with dark mountain spruce, crooked old pine, broad winter cedar, and alpine fir, drawn from a transparent pixel-art atlas and sharing the existing collision, breakage, and cat-climbing interactions. Rainbow jumps give a colorful powder trail. Small and large ice pools have irregular coves, narrow waists, snowy islands, frosted banks and cracks. The visible shoreline determines where ice starts and ends. Ice locks your entry direction and keeps you gliding even after release, including sideways and uphill. Only downhill entries accelerate: the acceleration remains 265 world units/s², with the ice limit raised from 1,200 to 1,800 world units/s. Sideways and uphill entries retain their entry speed. Predators steer around the pools; skiers can enter them and lose steering too.

Villages, the summit and marked course corridors are protected from ordinary bears and yetis. Polite Pursuit makes a specific exception for its three course-owned slow yetis: they can chase you on the piste and far off it while the run is active. Foxes are rare visitors to human areas; dangerous predators are excluded from protected starts, towns, approaches and ordinary course corridors; most predator encounters happen in the wilderness. Other yeti challenges and penalty chases still wait outside protected pistes. In the wilderness, yetis and bears can catch you. A catch shows its illustrated aftermath until you continue, then restarts you at the summit, preserving your wallet but losing unfinished course points. There is no death menu. Bears walk and gallop on all fours. Their explicit chase speed is now 30 km/h downhill (15 km/h sideways or uphill), with a 34 m wake radius; wild bears pursue for up to 1000 m of downhill travel, and course-owned bears pursue until the run ends. Leaving a course or being bumped by a dog/patrol no longer cancels an unrelated bear chase. Regular towns and protected areas remain refuges; Endless course towns admit their pursuing course monsters. A successful physical monster ram kills the creature and causes the normal player fall, stopping movement and requiring recovery. All killable enemy types use `resolveEnemyContact`; physical rams consume no equipment and grant no immunity. Player-initiated grounded rams require 85% of attainable sliding/traverse speed for the current heading and real approach/closing motion. The old species-specific speed and angle gates no longer block diagonal or sideways rams. Rear catches and matched-speed touches do not kill the pursuer. Killed animals fade out and do not resume chasing. Dogs and ski patrol knock you down without restarting you. The unpaid-entry ski-patrol penalty sends four fast skiers every five seconds for two minutes of active play. They approach, commit to an overtaking pass, heckle you about the unpaid ticket, and keep skiing downhill. Each skier can bump you only once. Waves continue after a crash, leaving or finishing the course, or taking the lift; death ends the penalty. Slow-speed collision protection still applies.

Wolves spawn in packs of 3–4, stay together, and chase nearby players slowly outside protected areas. Wolf selection is now much rarer: they account for 20% of predator selections, and the wilderness predator chance is 15%. New packs must be at least 140 metres from an existing wolf, with at most two packs within 280 metres of a proposed spawn. This reduces pack frequency without scattering lone wolves everywhere. Foxes and wolves hunt rabbits; a caught rabbit is consumed in a snow puff, and the predator pauses to eat. Both predators alternate gait frames with correctly facing sprites and a running bob. Fast skiers wear red and periodically enter from uphill at overtaking speed. They gently aim toward your predicted position while overtaking and have their own taunts and collision remarks. Wolves also pursue skiers outside protected areas; skiers shout and flee, and can be knocked down by a wolf. A genuine full-speed player ram kills a wolf in a snow puff; endangered nearby skiers thank you. Animals commit to avoidance turns around shorelines, buildings, and protected boundaries instead of flipping back and forth in place. Pedestrians take short, slow walks with pauses near their original positions, avoiding trees, rocks, buildings, ice and the flag openings. Finish spectators stay on their side of the finish and pause to cheer after a perfect run. Village residents follow their footpaths; all walking people have a small step-and-bob animation. Other skiers and snowboarders provide slower traffic. Cats attract nearby slower skiers. Hitting a cat at speed scares it toward a tree or house; it climbs to safety while the spectators complain.

## Village life

Towns mix cottages, balcony chalets, inns, cafés, ski shops, and three small two-storey hotels along the winding snow road. Building types are shuffled independently, with hotels near the route. Muted trim, warm windows, smoking chimneys, opening doors, shop awnings and snowy balconies give buildings variety without dividing town into themed districts. Café stands and ski racks avoid the road and house footprints; the lift retains its waiting guests.

Snowmen lose and recover their hats, powder piles burst into snow, and pigeon flocks scatter and return. These interactions are harmless and never spend shields. Nearby residents comment with cooldowns. Approach rabbits and foxes slowly and they may sniff around you; rushing close sends them fleeing. Residents feed rabbits, pet cats and dogs, and shoo foxes. Foxes chased away by bakery/market vendors carry a stolen pastry. Ordinary predator hunting still takes priority over rabbit curiosity. Two rabbits are added per village, with rare fox visits; bears and wolves are not added to town.

## Arcade

Ski through **Arcade** on the left of the summit entrance row. All four trail entrances share the same starting line. Arcade remains separate. Endless is a continuous, free slope with no finish lines or stage resets. Occasional towns are part of the course, where existing Yetis can follow you. Distance is the record; missed gates break the equipment combo but do not end the run. Gates earn the same shields/swords as Arcade.

The player top gradually rises from 90 toward 130 km/h over a gentler 4,800 m speed ramp (half the previous progression rate). Geometry, traffic, ice acceleration and owned enemy motion scale with that pace. Endless now follows a configurable sequence of distinct areas, with no stage resets: the original gentle opening, followed by towns, cozy snowy trails, long tree corridors, a huge empty lake, a cemetery, a short dense forest, ordinary open forest and a separate short randomized Wild Patch. Wide crowds are inserted randomly farther downhill, after safe transitions. The sequence repeats; section difficulty grows between visits. See [REGIONS.md](REGIONS.md) for the mechanics and settings.

The original first 450 metres retain their sparse trees and light traffic. Crowded Rush Hour Slopes cannot appear before 1,200 m and are inserted randomly after quiet/open-forest areas, with a minimum gap between crowds. Their broad slope follows the player's approach, spreads skiers across the whole width and uses dense side tree banks to prevent an easy edge bypass. They retain hunting Yetis and grow busier between visits.

Quiet trails extend the actual village-exit snow road along the approach, with nearby trees, walkers, slow skiers, a bench/lamp, a snowman and no gates; sparse woods continue beside the trail. Clear transition lakes and short dense forests also have no gates. A clear winding passage remains through each dense forest, while tree density doubles over repeated visits. Wild Patch is a separate 70–110-base-metre burst of randomized trees, rocks, stumps, bushes, sleds, small jumps and traffic, with no flags or reserved winding corridor. Normal forest keeps slalom gates, smaller random lakes, traffic and occasional hills/rainbows. Cemeteries are open slaloms between irregular grave and crypt clusters, with several gaps to choose from and boundary fences only. Resting zombies sit beside graves before stirring, while other walkers already patrol the openings. Bare skeletons are the jumpers: they rattle/rise, leap once and collapse into a stationary pile. Only entry/exit checkpoints are flagged; jumps, swords and true kill-and-crash rams retain their usual rules. Long forest corridors retain their branching routes, weaving gates and dense entrance/exit banks.

Towns still use the actual Arcade village generator: irregular streets, houses/shops/hotels, footpaths, animated residents and a snowy back route. House rows keep Arcade spacing while street widths narrow between town appearances. Resident count grows from 36 toward 120, and either route is selectable between the shared entry/exit checkpoints. Ordinary Arcade/course villages remain protected and retain their doubled population.

New predators do not spawn in quiet glades, clear lakes, dense forests, Wild Patches, cemeteries or towns. Cemetery zombies are the authored exception there, and crowd encounters add their own Yeti when the nearby budget allows. Existing awake enemies keep following between all areas at their real physical speeds, without teleportation or distance-based catch-up. Distant pursuers remain alive but no longer trigger a nearby-threat warning from kilometres away. Outside authored terrain, sparse normal woods continue. Current wallet, settings and distance records are preserved.

Yetis notice approaching skiers from at least 140 base metres, with additional lookahead/shorter wake delay for fast ice approaches. Dedicated encounters add alternating wolf packs and bears outside towns. Wolves/bears notice from at least 55 base metres and can continue their pursuit through course towns. Endless suppresses unrelated ambient wolves, bears and sleeping Yetis; unengaged course threats left offscreen behind you are removed, while active pursuers remain.

The selected Yeti families are [shown inside an actual game scene](yeti-options.html): **White Fang (1)** for regular/slow Yetis, **Avalanche (2)** for faster ones, and **Night Stalker (4)** for elite/special Yetis. Untiered hunters infer their family from speed; base speeds at least 80 km/h promote to Night Stalker, and 90+ use its special tint. Idle/waking, alternating running, feeding and knockout poses share the same tiny 30×34-pixel atlas cells (smaller slow variants retain their normal scale). Faster tiers step more quickly, with slate/violet/burgundy fur tints. Hitboxes and chase speeds are unchanged.

The selected source sheets and [generation prompts](design/yeti-concepts-prompts.md) are retained. `assets/yeti-sprites.png` contains nine baked native frames and adds about 10 KB of art to the self-contained game. `tools/bake-yeti-sprites.cjs` regenerates it through the production sprite renderer using optional authoring dependency `@napi-rs/canvas`; normal Python builds and playing/installing the game do not require Node or that dependency. `assets/yeti-sprites.frames.json` records frame rectangles. The old atlas aliases remain compatible. Edit yeti-options.template.html and rebuild to change the comparison page; yeti-options.html is generated.

Ordinary lake art rasterizes its outline/islands through Canvas once instead of repeatedly querying polygons for each pixel; fast ice movement and collisions are unchanged. Distant lake textures are released, road rendering visits only visible tile rows, and town footpath searches are spread over approaching simulation steps. Huge transition lakes draw their clipped shoreline and cracks directly, avoiding a giant texture allocation.

The `endless` config section controls the ramp, rates, lake sizes, town widths/population, gates and hunters. `endless.autoStart: true` opens directly at its start for practice; otherwise the summit has both Arcade and Endless entrances. Endless saves its own distance record alongside the existing wallet and Arcade records.

Skiers and snowboarders can now collide with scenery or each other, tumble, stay down for 4–5 seconds and get up with a short recovery animation. They keep their own clothing/poses and remain edible while down. Player falls also leave you vulnerable to predators: crash recovery no longer grants a shield for the duration of the fall. Equipment shields still block impacts and the normal brief resume protection remains.

## Villages

Each village gets a fresh layout, built once before it enters view. Its roughly 400-metre descent has 12 building bands and a target of about 70–90 small houses. The snow corridor varies its turns, widths and spacing; houses still follow that route, with uneven blocks and gaps for courtyards. House styles, plaza locations, and the lift station’s side and position also vary. A winding main street and routed footpaths connect the houses and lift; lanes avoid building footprints. Small squares appear at varied intervals with lamps, benches, snowmen, and overhead bunting where space permits. Four muted house trim styles share animated chimneys, warm windows, opening doors with waving residents, shop awnings, and occasional roof-snow slides. The fences have been removed. The main street and lift approach are covered in pale, textured snow and use normal snow physics. Snow also covers side-path junctions, so crossing them along the main street does not slow you down. Exposed side paths still slow skis; their paving remains fixed in world coordinates. Residents walk along the paths. Planned villages and distant gates are retained until you pass them, fixing the disappearing-house bug. The moving chairs and cable follow the slope down into town. Ski into the station to return to the summit. The course flags are all on one row below the village; additional choices lie to either side.

Paid courses deduct their fee only when you can afford it. Entry costs: Lunch Rush 210, Spore Decisions 220, Polite Pursuit 235, Last Lunch 245 coins. These are calibrated against the regular slalom's 247-coin perfect result before jumps or the new speed bonus (up to 307 with that bonus). Existing wallet balances are retained.

Entering without enough coins triggers a random ambush and makes the entire run ineligible for coins or a saved best, even with perfect gates. Failed gate quotas or missed finishes also award zero. For an eligible finish, the reward is gate/jump points + 45 + the crash bonus (50 with no crashes, otherwise max(0, 25 − 4 × crashes)) + the speed bonus for a timed course. The entry-price bonus has been removed.

At the end, an automatic 18-second overlay shows gates, percentage, misses, crashes, jumps, time, score, bonus, and coins or the reason for no reward. Skiing continues without menus. A successful 100%-gate run activates waving and shouting from spectators already waiting by the finish. Completed-course rewards, wallet balance, per-course personal best times, and the last 20 timed attempts per course save on this browser and device.

## Polite Pursuit

Paying for Polite Pursuit starts three slow yetis. They run at 42% of the course's straight-down top speed and keep tracking you at any distance while the run is active. Leaving the flags, going far sideways, stopping, or a dog/patrol knockdown does not end their chase. They can enter protected course corridors but avoid villages, buildings, and lakes. A village remains a refuge; the same yetis resume chasing when you leave it during an active run.

When the run finishes or is recorded as failed beyond its end, its yetis retreat and cannot catch you after the result. Getting caught still restarts you at the summit with your wallet intact. The high-speed impact rules still apply: you can kill these yetis with a sufficiently fast, nearly straight downhill hit. `politePursuit.count` and `speedRatio` tune this challenge. Its old best times no longer qualify because they were set with ineffective pursuers; history is retained.

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

- **Hosted/installed game:** rebuild after config edits and publish the generated `index.html` and `sw.js` with the JSON, icons and manifest. Startup upgrades use a consistent cached shell/config pair.
- **Local `file://` game:** edit the JSON, run `python3 build.py`, and reload `index.html`. Browsers restrict sibling-file fetches, so the offline HTML embeds the settings and assets.
- Changes to JavaScript, the template, or assets also require rebuilding. Invalid settings produce a clear startup error. The build validates the JSON before replacing the game.

## Assets and source

The player remains approximately 22 pixels wide, and trees are generally 30–45 pixels wide. The renderer samples the PNG sprite atlases into a fixed 30-color palette. The wildlife, cat, standing skier and uphill skier were made with the built-in image generation tool; prompts are recorded in `asset-prompts.md`.

Edit `game.js` and `index.template.html`, then run `python3 build.py` to rebuild the self-contained game. Ramps and snow humps are drawn as ground scenery beneath the player. The PNG previews are captures from the production canvas renderer.

## Development and publishing

Run `python3 build.py` after editing source, configuration, app metadata, the template, or PNG atlases. This regenerates `index.html` and the content-versioned `sw.js`. Use `python3 serve.py` and the printed `?dev=1` URL for local JSON editing without installed-app caching; normal hosted app startups use the complete built release. No package install or server is needed to play locally.

The repository includes the source, build script, documentation, original asset atlases, and built game. GitHub Pages serves the root of the `main` branch. Commit the rebuilt `index.html` with source changes and push `main` to publish updates.

## Review status

The source was reviewed for state, collision, configuration, wildlife, timing, and rendering issues. Fixes include retaining distant scenery, safe recovery from malformed saved data, configurable gate-point labels, matching skier poses to actual movement, and reducing pathfinding and road-rendering work. The offline game was rebuilt and the village and finish overlay were visually inspected with the production canvas renderer. No automated gameplay tests were run for this revision.

### Churned snow

Rugged slow zones use cached pixel-snow ridges with a soft boundary matching their collision polygon. Grounded skiers chatter and throw small powder flecks while crossing them; the existing `physics.ruggedSpeedRatio` still sets the slowdown. Airborne skiers do not show the slowdown effect.

### Hill readability and gameplay review

Small and large hills use revised native pixel-art SVG/PNG sources with raised snow crests and shaded downhill faces. Their existing widths and jump physics are retained. Jump cooldown no longer consumes a terrain trigger, and landing success feedback waits for collision resolution. See [the gameplay review](GAMEPLAY_REVIEW.md) for the remaining snowball reach limitation and three proposed movement-focused improvements.

Enemy pursuit is directional: horizontal and uphill components run at half speed, while downhill movement retains its configured pace. This applies to bears, yetis, hunting wolves, dogs and ski patrol.

Yetis of every color, bears and wolves always take a suitable edible NPC roughly on their way to you. They choose the nearest eligible target, including rabbits, cats, dogs, skiers and villagers, with no human preference or random skip at the default `predators.divertChance: 1`. Idle checks run every 0.2 seconds. Prey must be generally ahead, within 12 m of the route, with a small allowance just beyond the player and a 45-degree approach, with room for a short nearby sidestep. Endless hunters use their committed passage through bends. Hunts stay committed within wider 16 m / 60-degree limits; excessive drift returns the hunter to the player, while eight seconds without progress also ends the hunt. Dogs and patrol skiers already in the chasing-NPC list are also edible; predators remain inedible. Yetis and chasing bears eat NPCs they physically reach, even if someone else was selected; they pause for 0.8 seconds to eat, with a visible Yeti chewing pose and CHOMP, before resuming pursuit.

Skiers, snowboarders and walking villagers fear nearby wolves, roaming/chasing bears and awake Yetis. They shout and show a red `!`. Skiers flee downhill; pedestrians stop serving, chatting or cheering and run around obstacles, then return to their paths or homes when safe. Nonblocking shopkeepers can still be caught and eaten. Ordinary enemies do not frighten NPCs in protected areas; a course's own Yetis can frighten them on its piste. Dead, stunned, retiring and sleeping/waiting enemies do not trigger fear.

Falling trees and rolling snowballs are now mostly placed along the route between gates: trees stand close enough to fall across it, and balls start close enough to roll into it. They use normal stage rates. All hardcoded Warmup terrain demonstrations, including the slowdown patch and jump hills, have been removed. Jumping and steering still let you evade either encounter.

Slow skiers occasionally ease into a left or right turn, with straight stretches between turns. They stay near their own lane. Fast skiers gradually cut toward your predicted lane within 35 m, including while you approach one ahead of you; beyond that distance they straighten out. On snow, enemy fear takes priority over either behavior. On ice, incoming heading stays locked even when frightened.

Long logs span the route with their midpoint centered between gates. Their jump bumps share that midpoint, so the normal approach goes through the middle of the trunk.

Chasing Yetis, bears and wolves commit to a route around one end of a blocking log or fallen tree, then resume chasing. Yeti tier colors appear in their body tint; the former floating bar/scarf has been removed.


The retired campaign (documented in ARCADE.md) had five special stages interleaved through its run, keeping their recognizable names: Keep Your Momentum, Rush Hour, Aim Before Ice, Timber!, and Snowball Run. They introduce jump-versus-gate choices, dense moving traffic, chaotic large lakes, falling-tree warnings, and curved rolling balls; Keep Your Momentum keeps alternating slalom gates, with seven large hills, six rainbow jumps and only three slowdown patches in its current 40-gate run. Four jumps compete with the next gate: choose gate combo/gear or jump speed to escape, then rejoin the slalom. Other jumps remain aimable through their next gate, and placements vary each run. Its three bright magenta Yetis run at your configured 92 km/h against your 90 km/h top speed, with a four-second adjustment period before they chase. Their layouts and start instructions are selectable in `arcade.stageOverrides`; their ordered rows can be moved between stages. Earlier campaign records are retained separately under revision 8 after removing Air Time and Darker Woods, Icy Lakes. Timber!, Dense Chase and Snowball Run now form stages 10–12. The current replay starts at the summit, with Arcade beginning at stage 1.

Stage 2 introduces a single slow teal Yeti at 45 km/h across three clear gate approaches before its ordinary forest/traffic. Stage 6 now mixes irregular large lakes, skiers sliding without steering, and shoreline wolves/Yetis. Keep Your Momentum is now a harder stage at 9, after the faster-Yeti introductions. Random logs start appearing in Dense Chase (11); falling trees and rolling balls retain their focused introductions in Timber! (10) and Snowball Run (12). Earlier stages keep those hazards disabled.

Rush Hour now spans 40 gates (about 1,365 m), and predator prey detection reaches 35 m so Yetis can choose nearby skiers before their fear response carries them away. Keep Your Momentum has 40 gates, large hills/rainbow jumps, sparse rough snow and three Yetis. Aim Before Ice keeps its name but now uses random large lakes with NPCs sharing the player's control loss and predators waiting on snow.

Villages have distinct names, a natural snow-only back way behind houses that rejoins before the exit, and new bakery/cocoa/toyshop facades. Villagers idle, chat, wave and offer warm bread using a new 24-frame atlas. Backyard dogs hop excitedly, neighbors toss harmless snowballs, and shops/flower boxes/wreaths/porch lights bring more life to the streets. The back way is a gap between buildings, with snow covering crossing footpaths.

Monster ramming uses swept body contact and the player’s speed/motion at impact, including sleeping/waking/waiting creatures and fast glancing hits between simulation samples. Rams at 85% of the attainable speed for the actual steering/traverse mode kill the enemy and crash the skier, without requiring perfect aim, and another collision in the same frame does not erase that impact. Slower solid hits on dormant/waking monsters knock the skier down instead of silently slowing them. Jumps clear them and shields still protect. Being caught from behind, nearly matched-speed touches, near misses and already-fallen contacts do not kill the pursuer.

Eleven cozy 320×200 pixel-art scene cards cover wolf/bear/zombie/Yeti deaths, ordinary or perfect course finishes, Arcade block finishes and the final campaign victory. They stay visible for at least three seconds, then remain open until you tap/click the image or press a fresh key. Yeti cards follow the actual attacker’s White Fang, Avalanche or Night Stalker family/color. The game world and timers pause for the card; deaths/final victory return to the summit, other cards resume the slope. Linked Arcade joins keep flowing without cards. Every town has one cocoa shop: approach its front service window to claim one shield and a cocoa card, once per town. Outside Arcade/Endless, or when that inventory is full, the shield is saved in the persistent cocoa reserve and used by the usual obstacle-shield rules. Assets are embedded for offline play; [art prompts](design/scenes/prompts.json) and the [image manifest](assets/scenes/manifest.json) are retained.

Protected areas do not display inert hostile creatures. Ambient wolves/bears/Yetis cannot spawn there, and leftover inactive enemies are removed when protection changes. Finished Arcade blocks remove their retired enemies rather than showing harmless retreating monsters. Active authored stage enemies and allowed Endless-town pursuers remain.

Endless challenge areas now cover at least 600 base metres across, with wider entry/exit barriers and matching terrain on the flanks. Going sideways through a cemetery still meets burial gardens and zombies; towns retain chalet blocks, and forests/Wild Patches retain their obstacles. Clear lakes have broad shores instead of tapering into an easy side bypass. The width is configurable under `endless.regions.minimumWidthMetres`.

Cemeteries retain 70% downhill motion, with normal sideways steering. The fenced aisle and sideways detours are gone; choose your own openings between burial clusters while slow zombies gradually obstruct them. Some green/brown zombies rest by their graves before getting up; additional walkers already patrol the open gaps. Skeletons are fully visible at rest and have a short rise/rattle warning before one committed leap. That attack knocks you down; another undead creature or a pursuing predator can catch you while fallen.

Crowded Endless fields now contain 180→280 people in total, down from the former 500→600; Arcade Rush Hour traffic is lighter too. Static collision grids, road chunks, pixel text and predator candidate lists reuse cached work, with smaller long-obstacle bounds and less offscreen drawing. Saves and offline startup updates retain their existing behavior.

For quick Endless debugging, press a number from the summit or during an Endless run. Each jump starts a fresh preview at the area’s remembered visit step (initially 1), at normal starting pace, clears the old course actors, and waits for an arrow to start skiing. The current legitimate distance is saved before switching; the debug run cannot set an Endless distance record. Other modes, focused inputs/dialogs, modifier shortcuts and held repeats ignore these numbers. Scene cards still require their normal minimum display time and consume the continuing key.

| Key | Area |
| --- | --- |
| 1 | Regular forest |
| 2 | Tree corridors |
| 3 | Town |
| 4 | Crowded slope |
| 5 | Quiet snowy trail |
| 6 | Cemetery |
| 7 | Clear lake |
| 8 | Dense forest |
| 9 | Wild Patch |

The number row and numeric keypad both work. The debug HUD identifies the run; returning to normal play restores ordinary distance recording.

After selecting an area, `[` / `-` makes its preview easier and `]` / `+` makes it harder (`=` and keypad add/subtract also work). These use the actual repeat-visit progression: visits 1–6 with the default settings, clamped at both ends. The visit step appears in the toast/HUD. Each area remembers its own step for this session, including after returning to the summit. Switching back with its number restores that step. The area’s preview seed stays fixed, so comparing difficulty does not roll a completely new base layout; the preview restarts at the entrance after each change. Before an area is selected these keys do nothing. Quiet trails and clear lakes retain their deliberately unscaled relief designs; global distance-based speed progression is held at starting pace for these previews.

Cemetery visits now add 18→36 already-roaming zombies alongside the 36→72 resting walkers and 8→14 skeleton jumpers. Roamers patrol around their starting gap until spotting the skier, then chase. Nearby alert walkers move twice as fast while the skier is in the fall animation, with a faster gait; normal shuffling returns once the fall ends. Shared jumps, swords and ram kill+crash rules still apply.

The cemetery is now one enclosed graveyard, 3½ screens wide, with a single entrance/exit and continuous perimeter fencing. All three burial areas contain zombies, rather than separate lightly populated side expanses. Walking zombies are twice as fast as the preceding tuning (5→9 km/h baseline) and 50% more numerous; nearby walkers still hurry at double pace while you are knocked down.

Each cemetery has one large mausoleum near the main line. Approaching within 75 base metres opens its doors over 0.4 seconds; 6→10 zombies then emerge one by one, 0.45 seconds apart, once per cemetery. These pale-eyed runners use eight times the normal walker speed (40→72 km/h baseline, before existing local slope/pace scaling) and the usual nearby fallen-player boost. Shared contact, ram kill+crash, jumping and swords apply after they step outside. A clear forecourt keeps their exit free of graves.
