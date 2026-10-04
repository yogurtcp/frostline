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

Ski between physical flags to choose a course. Classic slalom contains only gates and people: trees, rocks, animals, ice pools, mushrooms, and ramps stay outside its corridor. Slalom is 540 metres; freestyle and tree slalom are 1,040 metres. Courses with gates require at least 90% correct (18 of 19 on the regular slalom), plus a downhill crossing between the finish flags. The finish opening is twice the width of that course's normal gate. Freestyle and free skiing have no gate quota but still require the finish crossing. Missing the finish allows a short uphill recovery window; continuing 32 metres beyond it records a failed run with no reward. Every set of choices shares one horizontal row. New course scenery starts beyond the visible screen, and the village is prepared before you approach the finish.

The surrounding mountain, including the forest uphill from the starting clearing, continues in every direction, with sparse trees, rocks, people, wildlife and sleeping yetis. Rabbit spawn weight is halved. Trees mix the original pines and firs with dark mountain spruce, crooked old pine, broad winter cedar, and alpine fir, drawn from a transparent pixel-art atlas and sharing the existing collision, breakage, and cat-climbing interactions. Rainbow jumps give a colorful powder trail. Small and large ice pools have irregular coves, narrow waists, snowy islands, frosted banks and cracks. The visible shoreline determines where ice starts and ends. Ice locks your entry direction and keeps you gliding even after release, including sideways and uphill. Only downhill entries accelerate: the acceleration remains 265 world units/s², with the ice limit raised from 1,200 to 1,800 world units/s. Sideways and uphill entries retain their entry speed. NPCs steer around the pools.

Villages, the summit and marked course corridors are protected: bears and yetis stay outside, including pursuers. Foxes and wolves are rare visitors to human areas and common in the wilderness. Yeti challenge and penalty chases wait outside the protected piste. In the wilderness, yetis and bears can catch you. A catch automatically restarts you at the summit, preserving your wallet but losing unfinished course points. There is no death menu. Bears chase much more slowly. A direct hit above 30 km/h knocks a bear out for 12 seconds; above 60 km/h does the same to a yeti. These thresholds use the HUD speed, and the player must be moving toward the animal. Dogs and ski patrol knock you down without restarting you.

Wolves spawn in packs of 3–4, stay together, and chase nearby players slowly outside protected areas. Foxes and wolves hunt rabbits; a caught rabbit is consumed in a snow puff, and the predator pauses to eat. Both predators alternate gait frames with correctly facing sprites and a running bob. Fast skiers wear red and periodically enter from uphill at overtaking speed. Other skiers and snowboarders provide slower traffic. Cats attract nearby slower skiers. Hitting a cat at speed scares it toward a tree or house; it climbs to safety while the spectators complain.

## Snowdrift Village

The village has four rows of houses, connected roads that slow skis (their paving pattern stays fixed as the camera moves), walking residents, and a chairlift terminal. The moving chairs and cable follow the slope down into town. Ski into the station to return to the summit. The course flags are all on one row below the village; additional choices lie to either side.

Paid courses deduct their fee only when you can afford it. Entry costs: Lunch Rush 210, Spore Decisions 220, Polite Pursuit 235, Last Lunch 245 coins. These are calibrated against the regular slalom's 247-coin perfect result before jumps. Existing wallet balances are retained.

Entering without enough coins triggers a random ambush and makes the entire run ineligible for coins or a saved best, even with perfect gates. Failed gate quotas or missed finishes also award zero. For an eligible finish, the reward is gate/jump points + 45 + the crash bonus (50 with no crashes, otherwise max(0, 25 − 4 × crashes)). The entry-price bonus has been removed.

At the end, an automatic 18-second overlay shows gates, percentage, misses, crashes, jumps, time, score, bonus, and coins or the reason for no reward. Skiing continues without menus. A successful 100%-gate run activates waving and shouting from spectators already waiting by the finish. Completed-course rewards and wallet balance save on this browser and device.

## Assets and source

The player remains approximately 22 pixels wide, and trees are generally 30–45 pixels wide. The renderer samples the PNG sprite atlases into a fixed 30-color palette. The wildlife, cat, standing skier and uphill skier were made with the built-in image generation tool; prompts are recorded in `asset-prompts.md`.

Edit `game.js` and `index.template.html`, then run `python3 build.py` to rebuild the self-contained game. Ramps and snow humps are drawn as ground scenery beneath the player. The PNG previews are captures from the production canvas renderer.

## Development and publishing

Run `python3 build.py` after editing `game.js`, `index.template.html`, or the PNG atlases. This regenerates the self-contained `index.html`. No package install or server is needed to play locally.

The repository includes the source, build script, documentation, original asset atlases, and built game. GitHub Pages serves the root of the `main` branch. Commit the rebuilt `index.html` with source changes and push `main` to publish updates.

## Verification status

The production renderer has been used to inspect the updated game. The older behavior simulation suite has not been rerun against the latest gameplay changes; its local historical reports are not included in this repository.
