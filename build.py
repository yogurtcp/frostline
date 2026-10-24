"""Build the offline, single-file game from its source and PNG sprite atlases."""
from pathlib import Path
import base64
import json
import hashlib

root = Path(__file__).resolve().parent
assets = {name: 'data:image/png;base64,' + base64.b64encode((root / 'assets' / file).read_bytes()).decode()
          for name, file in [('ski', 'ski-sprites.png'), ('village', 'village-sprites.png'), ('wildlife', 'wildlife-sprites.png'), ('trees', 'tree-sprites.png')]}
for name, file in [('hillSmall', 'hill-small.png'), ('hillLarge', 'hill-large.png'), ('fallingTree', 'falling-tree.png'), ('wideLog', 'wide-log-v2.png'), ('rollingSnowball', 'rolling-snowball.png'), ('bears', 'bear-sprites.png'), ('people', 'people-animations.png'), ('cozyBuildings', 'cozy-buildings.png')]:
    assets[name] = 'data:image/png;base64,' + base64.b64encode((root / 'assets' / file).read_bytes()).decode()
page = (root / 'index.template.html').read_text()
config = json.loads((root / 'game-config.json').read_text())
schema = json.loads((root / 'game-config.schema.json').read_text())
from config_validation import validate
validate(config, schema)
# Escape HTML script terminators in editable dialogue and labels.
encode = lambda data: json.dumps(data).replace('<', '\\u003c')
page = page.replace('__CONFIG__', encode(config)).replace('__SCHEMA__', encode(schema)).replace('__CONFIG_CODE__', (root / 'config.js').read_text())
page = page.replace('__ASSET_DATA__', json.dumps(assets)).replace('__GAME_CODE__', (root / 'game.js').read_text())
page = page.replace('__APP_CODE__', (root / 'app.js').read_text())
worker = (root / 'sw.template.js').read_text()
release = hashlib.sha256(page.encode() + worker.encode() + (root / 'manifest.webmanifest').read_bytes())
for name in ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']:
    release.update((root / 'assets' / name).read_bytes())
version = release.hexdigest()[:16]
page = page.replace('__BUILD_VERSION__', version)
(root / 'sw.js').write_text(worker.replace('__BUILD_VERSION__', version))
(root / 'index.html').write_text(page)
print(f'Built {root / "index.html"} ({len(page):,} characters), version {version}')
