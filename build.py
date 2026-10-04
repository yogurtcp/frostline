"""Build the offline, single-file game from its source and PNG sprite atlases."""
from pathlib import Path
import base64
import json

root = Path(__file__).resolve().parent
assets = {name: 'data:image/png;base64,' + base64.b64encode((root / 'assets' / file).read_bytes()).decode()
          for name, file in [('ski', 'ski-sprites.png'), ('village', 'village-sprites.png'), ('wildlife', 'wildlife-sprites.png'), ('trees', 'tree-sprites.png')]}
page = (root / 'index.template.html').read_text()
page = page.replace('__ASSET_DATA__', json.dumps(assets)).replace('__GAME_CODE__', (root / 'game.js').read_text())
(root / 'index.html').write_text(page)
print(f'Built {root / "index.html"} ({len(page):,} characters)')
