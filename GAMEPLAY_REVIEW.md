# Frostline implementation and gameplay review — 2026-10-11

The skiing, physical course selection, heading-locked jumps, persistent ice momentum, and towns already provide a strong foundation. The best next improvements are clearer terrain and deliberate routes that reward steering and jump timing. This review uses source inspection and staged production-canvas scenes, not a full campaign or phone playtest.

## Implemented in this revision

**Readable hill art.** The old small/large hills were low, flat caps. Their existing editable SVG sources now have raised asymmetric crests, folded snow lips, shaded downhill faces, and small powder fragments. The small source is 28×22 pixels; the large source is 56×36. Corresponding transparent PNGs are rasterized at native resolution. `drawHill` uses the image's actual aspect ratio, avoiding stretching when asset dimensions change. World widths, collision radii, jump durations, controls, and stage tuning remain as configured. `preview-hills.png` shows production-scale rendering alongside enlarged pixels.

**Jump cooldown no longer consumes a hill.** In `hit`, terrain was marked `touched` before `launch` checked cooldown. A grounded overlap during cooldown could permanently use up a hill without any jump. The trigger now waits for cooldown before consuming the feature. Staged contact showed `touched: false, air: 0` during cooldown, then a normal 0.88-second small-hill jump after cooldown.

**Landing feedback follows collision resolution.** `movePlayer` previously announced “SOFT LANDING” before `step` checked obstacles and pursuers. A staged landing directly on a rock both crashed and announced success. Feedback is now queued and shown after those contacts only if the skier remains upright. Existing jump scoring is retained: points still reward completing the jump, rather than introducing a new clean-landing scoring rule.

## Existing feature assessment

- **Long log and bump:** the repeated bark/end-cap rendering preserves thickness on the requested 100 m trunk. Capsule collision uses its full length; the 15 m bump extends airtime enough to clear the trunk downhill. Manual airborne contact also clears it. Its length makes takeoff alignment particularly important.
- **Falling tree:** sprite rotation and collision use the same base pivot and tilt. Its trunk and branches remain collidable after landing; airborne contacts return before collision side effects. The warning and marked landing direction help communicate the change.
- **Rolling snowball:** acceleration, a fixed curved path, swept skier contact, persistent tracks, scenery collision, and fading breakup are present. It has a distinct interaction from stationary snowballs and can be evaded after release.

**Remaining coverage limitation:** `snowballCurve` has a 24 m half-amplitude. The cosine-offset path therefore travels at most 48 m toward the skier from its spawn point. `snowballIntercept` rejects approaches outside that reach, even inside the 240 m arming range. Arcade placement can span ±55 m, so some spawned balls can stay idle through a normal descent. A staged ball 55 m left remained waiting as a straight skier passed. The opening demo at 36 m is within reach. A follow-up should align snowball placement with its reachable path, or explicitly tune sway width; increasing arming/travel distance alone does not solve this. No hidden stage or speed adjustment was made here.

## Three focused ways to make skiing more fun

1. **Short jump lines using existing terrain.** Arrange a hill, a log crossing, an open landing, and a second hill as a recognizable sequence. The interesting choice is the takeoff direction: jumping locks heading, so aligning the landing matters. Use a few authored patterns among ordinary random scenery, with landing space sized for the configured speed and airtime. Start with one short Arcade demonstration.
2. **Brief forks that rejoin.** Offer a longer clear bend and a shorter route requiring a well-aligned jump. Both return to the same next gate. This gives a meaningful route choice with existing skiing mechanics and physical signposts, without another menu or enemy interaction.
3. **A close-pass reward.** Recognize safely skiing close to a tree or rock at speed, with a small local score popup and short streak. Count each obstacle once, exclude walking/airborne passes, and only award after the skier has cleared it. This makes ordinary steering satisfying between gates. Keep it separate from shield/sword charging so it does not rebalance the existing gate combo.

My first experiment would be one short jump line. It makes the improved hills useful, adds a visible goal to takeoff direction, and can be tried in the existing opening demo before expanding the catalog or campaign.

## Verification and limits

JavaScript syntax and the offline build/config validation passed. Native-scale hill rendering was visually inspected. Staged scenes covered cooldown contact followed by a successful launch, a large-hill crossing without a fall, the out-of-reach snowball case, and an obstructed landing. No automated test suite or full phone/campaign playtest was run. Publication status must be checked separately from the local build.
