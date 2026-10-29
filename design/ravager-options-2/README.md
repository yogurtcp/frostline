# Ravager designs — second set

The first set was rejected: options1/2 resembled existing Yetis, and option3 was disliked. This set was generated anew with the **built-in imagegen tool**, without using the existing gorilla sprites as edit targets. The aim is three different silhouettes, not recolors. Full prompts: [prompts.json](prompts.json).

| Option | Shape | Generated source | Native sprite |
| --- | --- | --- | --- |
| 1 · Stiltwalker | Thin, long-necked and long-legged | [Source PNG](1-stiltwalker-source.png) | [24×38 PNG](1-stiltwalker-native.png) |
| 2 · Tuskbreaker | Wide, low, tusked charger | [Source PNG](2-tuskbreaker-source.png) | [38×26 PNG](2-tuskbreaker-native.png) |
| 3 · Ragjaw | Wide split jaw, narrow ragged body | [Source PNG](3-ragjaw-source.png) | [34×34 PNG](3-ragjaw-native.png) |

[Game-scale comparison](comparison.png) · [Slope scene](scene.png) · [Crop metadata](frames.json) · [Preview settings](preview.json) · [Published gallery](https://yogurtcp.github.io/frostline/ravager-options.html?v=round2)

The artwork is alpha-cropped and baked by the game's actual sprite renderer: nearest-neighbor sampling, production alpha cutoff and palette. Dimensions differ deliberately to retain each silhouette. In the scene each appears at its proposed native footprint; the skier, house, trees and zoom come from the game. Enlarged views are exactly3× and share a foot baseline. This is a static design proposal.

To regenerate, use the optional Node/Playwright/Chrome authoring tool:

```
node tools/render-ravager-preview.cjs design/ravager-options-2
```

Set NODE_PATH/CHROME_BIN if those dependencies are not on the normal paths. No game/runtime dependency is added. The [first set](../ravager-options/README.md) and [previous gallery](../../ravager-options-round-1.html) remain available.
