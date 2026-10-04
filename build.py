"""Build the offline, single-file game from its source and PNG sprite atlases."""
from pathlib import Path
import base64
import json

root = Path(__file__).resolve().parent
assets = {name: 'data:image/png;base64,' + base64.b64encode((root / 'assets' / file).read_bytes()).decode()
          for name, file in [('ski', 'ski-sprites.png'), ('village', 'village-sprites.png'), ('wildlife', 'wildlife-sprites.png'), ('trees', 'tree-sprites.png')]}
page = (root / 'index.template.html').read_text()
config = json.loads((root / 'game-config.json').read_text())
schema = json.loads((root / 'game-config.schema.json').read_text())
from config_validation import validate
validate(config, schema)
# Escape HTML script terminators in editable dialogue and labels.
encode = lambda data: json.dumps(data).replace('<', '\\u003c')
page = page.replace('__CONFIG__', encode(config)).replace('__SCHEMA__', encode(schema)).replace('__CONFIG_CODE__', (root / 'config.js').read_text())
page = page.replace('__ASSET_DATA__', json.dumps(assets)).replace('__GAME_CODE__', (root / 'game.js').read_text())
(root / 'index.html').write_text(page)
print(f'Built {root / "index.html"} ({len(page):,} characters)')
