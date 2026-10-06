# Arcade: 32 stages, one descent

Enter the purple Arcade flags at the summit. There are no fees, coin rewards, time bonuses, timers, or course choices in Arcade. Your existing wallet is preserved. Each completed stage leads into a randomized safe village; keep skiing beyond town to start the next numbered stage. Lifts remain scenery during Arcade.

Cross downhill between the finish flags to advance. Arcade does not require the regular 90% gate quota. Missed gates count in the run statistics and release yetis where specified below. Crossing the finish height outside the opening ends the run immediately; there is no uphill recovery window. Getting eaten also ends the run. Completing stage 32 wins Arcade and returns to the summit. All results appear on the snow without menus.

The local `frostline-v2` save now includes `arcadeRecord`: best distance, furthest stage reached, most stages completed, and the last recorded run/checkpoint. Progress records save at stage finishes and run end. Distance is furthest downhill progress from the Arcade entrance, including towns, so going back and forth cannot farm distance. Refreshing starts a new attempt; an in-progress run is not resumed.

## Pursuers

- Teal slow yetis: 42% of the stage's straight-down top speed.
- Orange fast yetis: 82%.
- Violet elite yetis: 94%.

Starting pursuers arrive when you cross the actual stage start. Miss penalties spawn just uphill of the missed gate. Pursuers keep following off piste; villages remain protected, and the previous stage's pursuers retire at its finish. Normal high-speed predator-impact rules still apply. No real-time limit ends a stage.

## Stage list

| # | Name | Length | Terrain / traffic | Pressure |
| --- | --- | --- | --- | --- |
| 1 | First Tracks | 540 m | Open | No starting pursuers |
| 2 | Personal Space | 650 m | Open; heavy fast-skier traffic | No starting pursuers |
| 3 | Mind the Pines | 650 m | Trees | No starting pursuers |
| 4 | Rush Hour | 650 m | Trees; heavy fast-skier traffic | No starting pursuers |
| 5 | Polite Pursuit | 850 m | Open | 3 slow yetis |
| 6 | Please Keep Moving | 850 m | Open; wider turns | 3 slow yetis |
| 7 | Guests in the Forest | 850 m | Trees | 3 slow yetis |
| 8 | No Loitering | 850 m | Trees; heavy fast-skier traffic | 3 slow yetis |
| 9 | Express Lane | 1100 m | Open | No starting pursuers |
| 10 | Orange Alert | 1100 m | Open | 3 fast yetis |
| 11 | Passing Problems | 1100 m | Open; heavy fast-skier traffic | 3 fast yetis |
| 12 | Timber Express | 1100 m | Trees | 3 fast yetis |
| 13 | Switchback Service | 1100 m | Open; wider turns | 3 fast yetis |
| 14 | Thread the Pines | 1100 m | Trees; wider turns | 3 fast yetis |
| 15 | One Small Mistake | 1200 m | Open | No starting pursuers; each miss: +1 slow |
| 16 | Growing Guest List | 1200 m | Open | 3 slow yetis; each miss: +1 slow |
| 17 | Flag Consequences | 1200 m | Open | 3 fast yetis; each miss: +1 fast |
| 18 | Forest Consequences | 1200 m | Trees | 3 fast yetis; each miss: +1 fast |
| 19 | Narrowly Employed | 1200 m | Open; narrow gates | 3 fast yetis |
| 20 | Branch Management | 1200 m | Trees; narrow gates | 3 fast yetis; each miss: +1 fast |
| 21 | Cold Feet | 1450 m | Open + ice; narrow gates | 3 fast yetis; each miss: +1 fast |
| 22 | Frozen Assets | 1450 m | Trees + ice; narrow gates | 3 fast yetis; each miss: +1 fast |
| 23 | Air Mail | 1450 m | Open + short jumps; narrow gates | 3 fast yetis; each miss: +1 fast |
| 24 | Rough Landing | 1450 m | Trees + short jumps; narrow gates, heavy fast-skier traffic | 3 fast yetis; each miss: +1 fast |
| 25 | Double Booking | 1450 m | Open; narrow gates | 3 fast yetis; each miss: +2 fast |
| 26 | Crowded House | 1450 m | Trees; narrow gates, heavy fast-skier traffic | 3 fast yetis; each miss: +2 fast |
| 27 | Violet Warning | 1300 m | Open | 2 elite yetis |
| 28 | Purple Among Pines | 1500 m | Trees; narrow gates | 2 elite yetis; each miss: +1 fast |
| 29 | Bad Reception | 1700 m | Open; narrow gates, wider turns, heavy fast-skier traffic | 2 elite yetis; each miss: +2 fast |
| 30 | The Long Way Down | 2200 m | Alternating forest / open / ice; narrow gates, wider turns | 2 elite yetis; each miss: +2 fast |
| 31 | Everything Is Fine | 2500 m | Alternating forest / open / ice / jumps; narrow gates, wider turns, heavy fast-skier traffic | 2 elite yetis; each miss: +2 fast |
| 32 | Last Tracks | 3000 m | Alternating forest / open / ice / jumps; narrow gates, wider turns, heavy fast-skier traffic | 2 elite yetis; each miss: +2 fast |

All levels and tuning live in `game-config.json` under `arcade`. Normal-speed stages use pace 156 or 178; fast stages use 228. Short ramps have reserved landing corridors, and ice patches leave an alternate snow line. Mixed stages alternate six sections, ending on open snow.

## Traffic and forest variety

Arcade uses separate controlled skier and tree schedules; ambient world generation is excluded from its course corridor. Stage 1 spaces skiers about 110 m apart; stage 2 about 65 m apart, with more aggressive overtakers. Wooded stages also include occasional short ramps, moguls, and bushes, roughly one feature every eight gates. Jump/ice-focused stages keep their own feature schedule.
