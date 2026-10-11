# Asset generation

## Four-legged bear replacement (2026-10-11)

Saved as `assets/bear-sprites.png`. Generated with the built-in `image_gen.imagegen` tool; `assets/wildlife-sprites.png` was style guidance only. The original wildlife atlas remains intact. The new strip contains two walking and two galloping poses, all quadrupeds. Atlas crops share a 500×280 source box with a common foot baseline; the game uses the normal palette conversion and displays bears at 30 pixels wide at default zoom.

Exact prompt:

Use case: stylized-concept. Create ONE production transparent PNG sprite strip for Frostline, a tiny muted pixel-art downhill skiing game. The supplied wildlife atlas is STYLE REFERENCE ONLY for chunky square pixel clusters, earthy brown fur, dark navy outlines and tiny in-game scale. Create exactly FOUR isolated sprites in one horizontal row, evenly spaced in four equal cells, same bear body size and baseline, generous fully transparent padding between sprites. Left to right: adult wild brown bear WALK frame A; same bear WALK frame B with alternating paws; same bear RUN / gallop frame A; same bear RUN / gallop frame B. All four face RIGHT, seen from slightly above and the side. Every pose is a natural QUADRUPED on FOUR FEET: long horizontal heavy body, large shoulder hump, lower rump, small round ears, extended muzzle, tiny dark eye, short barely visible tail, powerful short legs, dark paws and restrained claws. Walking poses grounded with believable alternating fore/hind feet. Running poses low and powerful, alternating gathered and extended legs. Wild bear anatomy and imposing weight; no standing upright, no humanoid body, no exposed cream belly, no teddy-bear face, no cute smile, no accessories. True low-resolution pixel art designed as approximately 34 pixels wide and 21 pixels tall per bear, enlarged with hard nearest-neighbor square pixels, limited muted brown/tan/dark navy/slate palette, a few chunky highlights; no gradients or smooth painterly detail. No ground, snow terrain, cast shadow, background, text, labels, grid, frame borders, or other creatures. Actual transparent alpha background. Approximately 1536x512 strip; complete paws and ears in every cell.

Tool: built-in `image_gen.imagegen`.

`assets/ski-sprites.png` is the earlier generated skiing sprite sheet from this task.

`assets/village-sprites.png` used the skiing sheet as a style reference with this prompt:

Use case: stylized-concept. Asset type: production sprite atlas for an original top-down skiing game. Create a TRANSPARENT PNG 1536 x 1536 containing exactly 16 isolated crisp beautiful 16-bit pixel-art sprites on a strict four-column by four-row grid. Each cell 384 x 384, each sprite centered in its own cell with at least 32 pixels completely transparent padding on every side. No text, labels, grid lines, scenery, or background. Match the detailed teal, navy, icy white and warm orange pixel-art skiing sprites in the reference image. Rich hand-placed pixel clusters, chunky 1-bit edges, warm inviting snowy alpine village, elevated front/top-down view, no smoothing. ROW 1 left to right: a wide warm wood alpine lodge with snow roof and glowing amber windows; a little red ski-rental cabin with skis outside; a wooden chairlift terminal with snow-covered roof and empty chair; a wooden directional signpost with blank boards. ROW 2 left to right: cute brown-and-white mountain dog running toward bottom of screen; same dog running diagonal left; same dog running diagonal right; colorful purple snowboarder seen from slightly above, heading down screen. ROW 3 left to right: a small bundled villager in a cranberry parka and cream hat; a small bundled villager in mustard coat holding hot cocoa; a small bundled villager in green parka with pompom hat; a large bright red mushroom with white spots sticking out of snow. ROW 4 left to right: a broken pine stump with fallen branch on snow; an icy rounded mogul with blue shaded side; a red wooden sled with brass runners; a small snowy shrub with orange berries. All 16 sprites fully isolated, consistent camera, completely transparent background, no checkerboard, no ground tiles. Larger buildings should use almost all their cell, humans and dogs should be centered with generous padding. Reference is style guidance only; keep every requested sprite clearly separate.

The game renders these assets at a small native pixel size, with a fixed palette and nearest-neighbor display.

## Wildlife and upright skier poses

File: `assets/wildlife-sprites.png`. Tool: built-in `image_gen.imagegen`.

Create an original transparent pixel-art sprite atlas for a tiny retro top-down skiing game. Exactly 12 sprites on a regular 4-column 3-row grid, canvas 1024x768. Each sprite in its own 256x256 cell with 30px transparent padding. Very SIMPLE chunky low-resolution sprites, each designed as if only 24 to 32 pixels across and then enlarged with nearest neighbor. Limited 16-color palette, no fine detail, no gradients, no smooth outlines, no text or labels, no scenery. Camera slightly overhead, looking down toward characters that face the viewer or side; all characters upright. Row1: small brown bear standing; same bear running; tiny white rabbit sitting with long ears; same rabbit hopping right. Row2: small gray wolf walking right; same gray wolf running left; small orange fox standing side view; same orange fox leaping. Row3: tiny orange-and-white cat sitting; same cat climbing upright a surface, paws up, no tree or background; skier wearing TEAL jacket ORANGE scarf NAVY pants with parallel skis SIDEWAYS and poles planted, standing still, whole body upright; same skier side view climbing uphill with stepping skis and poles, body still upright NOT inverted. Separate each sprite cleanly with actual transparency. Match the simple compact silhouettes of a late-1990s skiing game, not large detailed illustrations. No resemblance to specific copyrighted characters.


## Replacement tree atlas

Generated with the built-in image-generation tool. Saved as `assets/tree-sprites.png`; the original ski sprite atlas was used only as a style reference. The simple bright geometric tree variants were removed from the renderer.

Prompt:

> Use case: stylized-concept. Asset type: ONE transparent PNG sprite atlas for the existing tiny pixel-art skiing game Frostline. The attached atlas is a STYLE REFERENCE ONLY, especially its snow-covered pine trees. Create a NEW atlas containing exactly four different snow-covered trees, arranged in one horizontal row, evenly spaced in four equal-width cells. Same ground baseline, generous transparent gutters, nothing touches cell borders. Left to right: (1) dark dense irregular mountain spruce, (2) slightly crooked old pine with asymmetrical boughs and visible brown trunk, (3) broad gnarly winter cedar with rounded clumps of deep evergreen foliage, (4) narrow snow-heavy alpine fir. These must be beautiful genuine chunky pixel art, designed to read at only 32–42 pixels wide and 45–60 pixels tall in-game, enlarged with hard nearest-neighbor square pixels in the delivered atlas. Match the reference's textured branch clusters, dark outlines, dappled snow caps, natural irregular silhouettes and depth. Rich organic branch structure, NOT repeated triangular geometric layers, NOT smooth illustrations. Muted dark forest green, desaturated slate teal, charcoal navy outlines, earthy dark brown bark, restrained gray-blue snow shadows and off-white snow highlights. No bright gold, no yellow foliage, no vivid cyan, no pastel trees, no neon. Snow highlights occupy less than half of each silhouette so trees read substantially dark. Top-down three-quarter view like the reference game trees. True transparent alpha background, no background scene, no floor, no cast shadows, no labels, no text, no grid lines. Exactly four complete isolated trees, all approximately the same visual height.

## Interactive slope features (October 2026)

Generated with the built-in `image_gen.imagegen` tool, using `assets/tree-sprites.png` as style guidance. Originals retain their generated transparency; the renderer uses tight atlas rectangles and the existing palette conversion. The log's snow bump reuses the existing mogul sprite.

### fallingTree

Saved as `assets/falling-tree.png`.

Use case: stylized-concept. Asset type: transparent pixel-art game sprite for Frostline, viewed slightly from above/front. Reference image is STYLE GUIDANCE ONLY. Match muted dark evergreen/slate teal/navy outlines, earthy bark, off-white snow with gray-blue shadows. Chunky genuine low-resolution pixel art readable at tiny size, no gradients, no text, no background or cast shadow. One isolated complete sprite with generous transparent padding. Primary request: one tall narrow old snow-covered alpine pine, upright, with a clearly visible long brown trunk, irregular asymmetrical dark branches, about twice as tall as wide. Base at bottom center. Sparse snow caps, foliage substantially dark. Intended to be animated rotating about its base.

### wideLog

Saved as `assets/wide-log.png`.

Use case: stylized-concept. Asset type: transparent pixel-art game sprite for Frostline, viewed slightly from above/front. Reference image is STYLE GUIDANCE ONLY. Match muted dark evergreen/slate teal/navy outlines, earthy bark, off-white snow with gray-blue shadows. Chunky genuine low-resolution pixel art readable at tiny size, no gradients, no text, no background or cast shadow. One isolated complete sprite with generous transparent padding. Primary request: one wide fallen tree trunk lying horizontally left-to-right, five times as wide as tall, rough dark brown bark, visible cut wood rings on one end, two tiny snapped branch stubs and irregular snow cap along top. No standing tree, no foliage, no ground.

### rollingSnowball

Saved as `assets/rolling-snowball.png`.

Use case: stylized-concept. Asset type: transparent pixel-art game sprite for Frostline, viewed slightly from above/front. Reference image is STYLE GUIDANCE ONLY. Match muted dark evergreen/slate teal/navy outlines, earthy bark, off-white snow with gray-blue shadows. Chunky genuine low-resolution pixel art readable at tiny size, no gradients, no text, no background or cast shadow. One isolated complete sprite with generous transparent padding. Primary request: one large compact nearly circular snowball, slightly irregular chunky silhouette, icy blue shaded underside, off-white top, a few distinctive blue-gray curved compressed snow seams so rotating the sprite visibly reads as rolling. No other objects.

### wideLog replacement

Saved as `assets/wide-log-v2.png`, generated with the built-in image tool from `assets/wide-log.png`. Active log art uses a fixed drawn height, repeats its middle bark section, and preserves the cut ends at native pixel scale.

Use case: precise-object-edit. Asset type: replacement transparent pixel-art log sprite for Frostline. Input image is the edit target. Redraw it as one clear horizontal cylindrical fallen timber log with a large recognizable warm tan circular cut face and simple dark concentric growth rings on the left, continuous rich earthy medium-brown bark with chunky longitudinal grooves, and a smaller broken timber end on the right. Make most of the visible body BROWN WOOD, with only a very thin irregular dusting of off-white snow along its top edge. Remove the tall branch stubs and leafy/green-looking patches. Straight long trunk silhouette, roughly eight times as long as its thickness, seen slightly from above/front. Muted navy outlines, restrained gray-blue snow shading. Genuine chunky low-resolution pixel art with clear clusters, readable at 12–18 screen pixels tall. The centre of the trunk should be fairly even in thickness so its bark can be repeated sideways in the game. One complete isolated sprite on truly transparent alpha, generous transparent margins, no scene, ground, shadow, text or labels. Preserve the existing game's pixel art style.

## Hill art revision (2026-10-11)

Edited the existing native pixel-art vector sources `assets/hill-small.svg` and `assets/hill-large.svg` directly, then rasterized them to the matching transparent PNG files with the native Canvas renderer. No image-generation tool or generation prompt was used for this revision. Small source: 28×22; large source: 56×36. Art direction: raised asymmetric snow crests, folded sunlit lips, layered muted blue-gray downhill faces, sparse powder fragments, hard pixel edges, and the existing off-white snow palette. Keep the existing world widths and physics; render using each image's native aspect ratio. `preview-hills.png` is a production-canvas preview with enlarged pixel samples.
