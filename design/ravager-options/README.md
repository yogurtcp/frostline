# Ravager design options

Three new design previews for Frostline's fast, distracted, all-creature-eating Yeti. Created with the **built-in imagegen tool**, using `design/gritty/monsters.png` as the edit/style reference. Full prompts are in [prompts.json](prompts.json).

| Option | Generated source | Actual 30×34 sprite |
| --- | --- | --- |
| 1 · The Maw | [Source PNG](1-the-maw-source.png) | [Native PNG](1-the-maw-native.png) |
| 2 · Bonecrown | [Source PNG](2-bonecrown-source.png) | [Native PNG](2-bonecrown-native.png) |
| 3 · Rusthowl | [Source PNG](3-rusthowl-source.png) | [Native PNG](3-rusthowl-native.png) |

[Game-size comparison](comparison.png) · [Slope-only scene](scene.png) · [Crop metadata](frames.json) · [Published gallery](https://yogurtcp.github.io/frostline/ravager-options.html)

The source concepts are cropped to their alpha bounds and baked through the production `sprite()` renderer: nearest-neighbor 30×34 output, normal alpha cutoff and the game's actual palette. The preview places each at the normal fast-Yeti width of59 world units with zoom0.5, yielding30 screen pixels. The enlarged view is exactly3× those native sprites. It is a static design comparison, not an animation preview.

`tools/render-ravager-preview.cjs` recreates the PNGs using Node, Playwright and Chrome (optional authoring dependencies, not needed to play or build the game). Set `NODE_PATH` to a directory containing Playwright and optionally `CHROME_BIN`. It serves a temporary, instrumented local copy of the current built game, then closes the test browser/server; it does not modify gameplay code, the live Yeti selection, saves or tuning.
